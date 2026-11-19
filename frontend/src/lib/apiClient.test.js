import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from './apiClient.js';
import { mediaPath } from '../admin/storage.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
/** A client whose network is a list of canned answers; `calls` records what was sent. */
function setup(...answers) {
  const calls = [];
  const queue = [...answers];
  const fetchImpl = vi.fn(async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body });
    const next = queue.shift();
    return typeof next === 'function' ? next() : next || json({});
  });
  return { api: createApiClient('http://api.test/api/', fetchImpl), calls, fetchImpl };
}
const session = (extra = {}) => ({ access_token: 'A1', refresh_token: 'R1', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1', email: 'a@b.co' }, ...extra });

describe('from(table)', () => {
  it('sends the query and returns { data, count }', async () => {
    const { api, calls } = setup(json({ data: [{ id: 1 }], count: 7 }));
    const r = await api.from('courses').select('*', { count: 'exact' }).eq('published', true).order('sort_order', { ascending: true }).order('created_at').limit(5);
    expect(calls[0].url).toBe('http://api.test/api/db/courses');
    expect(calls[0].body).toEqual({ op: 'select', select: '*', count: 'exact', filters: [['eq', 'published', true]], order: [['sort_order', true], ['created_at', true]], limit: 5 });
    expect(r).toEqual({ data: [{ id: 1 }], error: null, count: 7 });
  });

  it('count + head asks for the number only', async () => {
    const { api, calls } = setup(json({ data: null, count: 3 }));
    const r = await api.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid');
    expect(calls[0].body.head).toBe(true);
    expect(r.count).toBe(3);
  });

  it('insert(...).select("id").single() returns the new row', async () => {
    const { api, calls } = setup(json({ data: { id: 'n1' } }));
    const r = await api.from('courses').insert({ title: 'x' }).select('id').single();
    expect(calls[0].body).toMatchObject({ op: 'insert', values: { title: 'x' }, returning: 'id', mode: 'single' });
    expect(r.data).toEqual({ id: 'n1' });
  });

  it('update / delete / in / match / upsert options', async () => {
    const { api, calls } = setup();
    await api.from('t').update({ a: 1 }).eq('id', 'x');
    await api.from('t').delete().in('id', ['a', 'b']);
    await api.from('t').update({ a: 1 }).match({ k: 1, j: 2 });
    await api.from('t').upsert([{ a: 1 }], { onConflict: 'slot_date,slot_time', ignoreDuplicates: true });
    expect(calls[0].body).toMatchObject({ op: 'update', filters: [['eq', 'id', 'x']] });
    expect(calls[1].body).toMatchObject({ op: 'delete', filters: [['in', 'id', ['a', 'b']]] });
    expect(calls[2].body.filters).toEqual([['eq', 'k', 1], ['eq', 'j', 2]]);
    expect(calls[3].body).toMatchObject({ op: 'upsert', onConflict: 'slot_date,slot_time', ignoreDuplicates: true });
  });

  it('turns a failure into { data: null, error } with the database code (23505 = already on the list)', async () => {
    const { api } = setup(json({ message: 'duplicate key value violates unique constraint', code: '23505' }, 409));
    const r = await api.from('newsletter_subscribers').insert({ email: 'a@b.co' });
    expect(r.data).toBeNull();
    expect(r.error.code).toBe('23505');
    expect(r.error.message).toMatch(/duplicate/);
  });

  it('never throws when the network is down', async () => {
    const api = createApiClient('http://api.test/api', async () => { throw new TypeError('Failed to fetch'); });
    const r = await api.from('courses').select('*');
    expect(r.error.message).toBe('Failed to fetch');
    expect((await api.rpc('public_settings')).error).toBeTruthy();
  });
});

describe('rpc', () => {
  it('posts the arguments and unwraps { data }', async () => {
    const { api, calls } = setup(json({ data: { ok: true } }));
    const r = await api.rpc('check_booking', { p: { kind: 'session' } });
    expect(calls[0].url).toBe('http://api.test/api/rpc/check_booking');
    expect(calls[0].body).toEqual({ p: { kind: 'session' } });
    expect(r).toEqual({ data: { ok: true }, error: null });
  });
  it('the error message is the phrase the site understands', async () => {
    const { api } = setup(json({ message: 'slot taken' }, 400));
    expect((await api.rpc('check_booking', {})).error.message).toBe('slot taken');
  });
});

describe('auth', () => {
  it('signs in, keeps the session, and sends the token on later calls', async () => {
    const { api, calls } = setup(json(session()), json({ data: true }));
    const events = [];
    api.auth.onAuthStateChange((e) => events.push(e));
    const r = await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    expect(r.error).toBeNull();
    expect(calls[0].body).toEqual({ grant_type: 'password', email: 'a@b.co', password: 'x' });
    expect((await api.auth.getSession()).data.session.user.email).toBe('a@b.co');
    await api.rpc('is_admin');
    expect(calls[1].headers.Authorization).toBe('Bearer A1');
    expect(events).toEqual(['SIGNED_IN']);
  });

  it('wrong password / unconfirmed email come back as an error whose text the site matches', async () => {
    const { api } = setup(json({ message: 'Email not confirmed' }, 400));
    const r = await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    expect(/confirm/i.test(r.error.message)).toBe(true);
    expect((await api.auth.getSession()).data.session).toBeNull();
  });

  it('signUp passes profile data and the redirect; no session until confirmed', async () => {
    const { api, calls } = setup(json({ user: { id: 'u', email: 'a@b.co' }, session: null }));
    const r = await api.auth.signUp({ email: 'a@b.co', password: 'pw', options: { data: { full_name: 'A' }, emailRedirectTo: 'http://s/account' } });
    expect(calls[0].body).toEqual({ email: 'a@b.co', password: 'pw', data: { full_name: 'A' }, redirect_to: 'http://s/account' });
    expect(r.data.session).toBeNull();
    expect(r.error).toBeNull();
  });

  it('an address that already has an account comes back with no identities (the site relies on this)', async () => {
    const { api } = setup(json({ user: { id: 'x', email: 'a@b.co', identities: [] }, session: null }));
    const r = await api.auth.signUp({ email: 'a@b.co', password: 'pw' });
    expect(r.data.user.identities).toEqual([]);
  });

  it('refreshes once when the server says 401, then repeats the call', async () => {
    const { api, calls } = setup(json(session()), json({ message: 'sign in required' }, 401), json(session({ access_token: 'A2' })), json({ data: 5 }));
    await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    const r = await api.rpc('my_orders');
    expect(r.data).toBe(5);
    expect(calls[2].url).toMatch(/auth\/token$/);
    expect(calls[2].body).toEqual({ grant_type: 'refresh_token', refresh_token: 'R1' });
    expect(calls[3].headers.Authorization).toBe('Bearer A2');
  });

  it('a dead refresh token signs the person out', async () => {
    const { api } = setup(json(session()), json({ message: 'x' }, 401), json({ message: 'invalid refresh token' }, 401));
    const events = [];
    await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    api.auth.onAuthStateChange((e) => events.push(e));
    const r = await api.rpc('my_orders');
    expect(r.error).toBeTruthy();
    expect(events).toContain('SIGNED_OUT');
    expect((await api.auth.getSession()).data.session).toBeNull();
  });

  it('updateUser keeps the new session after a password change', async () => {
    const { api, calls } = setup(json(session()), json({ user: { id: 'u1', email: 'a@b.co' }, session: session({ access_token: 'NEW' }) }), json({ data: 1 }));
    await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    const r = await api.auth.updateUser({ password: 'newpass1' });
    expect(calls[1].method).toBe('PUT');
    expect(r.error).toBeNull();
    await api.rpc('is_admin');
    expect(calls[2].headers.Authorization).toBe('Bearer NEW');
  });

  it('reset email asks the server and reports no error even for unknown addresses', async () => {
    const { api, calls } = setup(json({}));
    const r = await api.auth.resetPasswordForEmail('a@b.co', { redirectTo: 'http://s/account' });
    expect(calls[0].body).toEqual({ email: 'a@b.co', redirect_to: 'http://s/account' });
    expect(r.error).toBeNull();
  });

  it('signOut clears the session on this device', async () => {
    const { api } = setup(json(session()));
    await api.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    await api.auth.signOut();
    expect((await api.auth.getSession()).data.session).toBeNull();
  });
});

describe('functions and files', () => {
  it('invoke returns the data, or an error whose context.json() has the code', async () => {
    const { api } = setup(json({ country: 'EG' }), json({ error: 'not_configured' }, 400));
    expect((await api.functions.invoke('geo')).data).toEqual({ country: 'EG' });
    const r = await api.functions.invoke('send-code', { body: { kind: 'email' } });
    expect((await r.error.context.json()).error).toBe('not_configured');
  });

  it('public file links keep the shape the admin screen recognises', () => {
    const { api } = setup();
    const url = api.storage.from('media').getPublicUrl('images/12-my pic.png').data.publicUrl;
    expect(url).toBe('http://api.test/api/storage/v1/object/public/media/images/12-my%20pic.png');
    expect(mediaPath(url)).toBe('images/12-my pic.png');
  });

  it('upload sends the file as a form, remove and signed links call the server', async () => {
    const { api, calls } = setup(json({ path: 'images/a.png' }), json({ removed: 1 }), json({ signedUrl: 'http://api.test/x?token=t' }));
    const up = await api.storage.from('media').upload('images/a.png', new Blob(['x']), { upsert: false });
    expect(up.error).toBeNull();
    expect(calls[0].url).toBe('http://api.test/api/storage/media/upload');
    expect(calls[0].body.get('path')).toBe('images/a.png');
    expect(calls[0].headers['Content-Type']).toBeUndefined(); // the browser sets the multipart boundary itself
    await api.storage.from('media').remove(['images/a.png']);
    expect(calls[1].body).toEqual({ paths: ['images/a.png'] });
    const s = await api.storage.from('paid-files').createSignedUrl('courses/p.pdf', 3600);
    expect(s.data.signedUrl).toMatch(/token=t/);
    expect(calls[2].body).toEqual({ path: 'courses/p.pdf', expiresIn: 3600 });
  });
});
