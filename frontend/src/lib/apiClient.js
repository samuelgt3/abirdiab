/**
 * Talks to the Django backend (see /backend). It offers the same small set of calls the site always used
 * (from / rpc / auth / storage / functions), so no other file needed to change.
 *
 * Every call answers { data, error } and never throws, exactly like before.
 */
const SESSION_KEY = 'abir-session';

const hasStorage = () => { try { return typeof localStorage !== 'undefined'; } catch { return false; } };
const now = () => Math.floor(Date.now() / 1000);

export function createApiClient(baseUrl, fetchImpl) {
  const API = String(baseUrl || '').replace(/\/$/, '');
  const doFetch = (...a) => (fetchImpl || fetch)(...a);

  // ------------------------------------------------------------------ session
  let session = null;
  const listeners = new Set();

  if (hasStorage()) {
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
  }
  const save = () => {
    if (!hasStorage()) return;
    try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
  };
  const emit = (event) => listeners.forEach((cb) => { try { cb(event, session); } catch (e) { console.warn('[auth]', e); } });
  function setSession(s, event) { session = s || null; save(); emit(event); }

  // Links in emails (confirm, reset) come back as  /account#access_token=...&type=recovery
  function takeSessionFromUrl() {
    if (typeof window === 'undefined' || !window.location.hash.includes('access_token=')) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const access = p.get('access_token');
    const refresh = p.get('refresh_token');
    if (!access || !refresh) return;
    const expiresAt = Number(p.get('expires_at')) || now() + (Number(p.get('expires_in')) || 3600);
    const type = p.get('type');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    session = { access_token: access, refresh_token: refresh, expires_at: expiresAt, user: null };
    save();
    // fetch the user, then announce
    request('auth/user', { method: 'GET' }).then((r) => {
      if (r.error) { setSession(null, 'SIGNED_OUT'); return; }
      session = { ...session, user: r.data.user };
      save();
      emit(type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN');
    });
  }

  // ------------------------------------------------------------------ http
  let refreshing = null;
  function refresh() {
    if (!session?.refresh_token) return Promise.resolve(false);
    refreshing ||= doFetch(`${API}/auth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: session.refresh_token }),
    }).then(async (res) => {
      if (!res.ok) { if (res.status === 401 || res.status === 400) setSession(null, 'SIGNED_OUT'); return false; }
      setSession(await res.json(), 'TOKEN_REFRESHED');
      return true;
    }).catch(() => false).finally(() => { refreshing = null; });
    return refreshing;
  }

  /** One HTTP call. Resolves { data, error, status }. */
  async function request(path, { method = 'POST', body, form, retry = true } = {}) {
    if (session && session.expires_at - now() < 60) await refresh();
    const headers = {};
    if (!form) headers['Content-Type'] = 'application/json';
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    let res;
    try {
      res = await doFetch(`${API}/${path}`, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)) });
    } catch (e) {
      return { data: null, error: { message: e?.message || 'Network error', code: 'network' }, status: 0 };
    }
    if (res.status === 401 && session && retry && await refresh()) return request(path, { method, body, form, retry: false });
    let json = null;
    try { json = await res.json(); } catch { json = null; }
    if (!res.ok) {
      return { data: null, error: { message: json?.message || json?.error || `Request failed (${res.status})`, code: json?.code || String(res.status), status: res.status, json }, status: res.status };
    }
    return { data: json, error: null, status: res.status };
  }

  // ------------------------------------------------------------------ auth
  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signUp({ email, password, options = {} }) {
      const r = await request('auth/signup', { body: { email, password, data: options.data, redirect_to: options.emailRedirectTo } });
      if (r.error) return { data: { user: null, session: null }, error: r.error };
      return { data: { user: r.data.user, session: r.data.session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const r = await request('auth/token', { body: { grant_type: 'password', email, password } });
      if (r.error) return { data: { user: null, session: null }, error: r.error };
      setSession(r.data, 'SIGNED_IN');
      return { data: { user: r.data.user, session: r.data }, error: null };
    },
    async signInWithOAuth() {
      return { data: null, error: { message: 'Google sign-in is not connected yet.' } };
    },
    async resetPasswordForEmail(email, options = {}) {
      const r = await request('auth/recover', { body: { email, redirect_to: options.redirectTo } });
      return { data: r.error ? null : {}, error: r.error };
    },
    async updateUser({ password, data } = {}) {
      const body = {};
      if (password !== undefined) body.password = password;
      if (data !== undefined) body.data = data;
      const r = await request('auth/user', { method: 'PUT', body });
      if (r.error) return { data: { user: null }, error: r.error };
      setSession(r.data.session || { ...session, user: r.data.user }, 'USER_UPDATED');
      return { data: { user: r.data.user }, error: null };
    },
    async signOut() {
      setSession(null, 'SIGNED_OUT');
      return { error: null };
    },
  };

  // ------------------------------------------------------------------ tables: from('x').select().eq()...
  class Query {
    constructor(table) { this.t = table; this.b = { op: 'select', filters: [], order: [] }; }
    select(cols = '*', opts = {}) {
      if (this.b.op === 'select') { this.b.select = cols; if (opts.count) this.b.count = opts.count; if (opts.head) this.b.head = true; } else this.b.returning = cols || '*';
      return this;
    }
    insert(values) { this.b.op = 'insert'; this.b.values = values; return this; }
    update(values) { this.b.op = 'update'; this.b.values = values; return this; }
    upsert(values, opts = {}) { this.b.op = 'upsert'; this.b.values = values; if (opts.onConflict) this.b.onConflict = opts.onConflict; if (opts.ignoreDuplicates) this.b.ignoreDuplicates = true; return this; }
    delete() { this.b.op = 'delete'; return this; }
    _f(op, col, val) { this.b.filters.push([op, col, val]); return this; }
    eq(c, v) { return this._f('eq', c, v); }
    neq(c, v) { return this._f('neq', c, v); }
    gt(c, v) { return this._f('gt', c, v); }
    gte(c, v) { return this._f('gte', c, v); }
    lt(c, v) { return this._f('lt', c, v); }
    lte(c, v) { return this._f('lte', c, v); }
    in(c, v) { return this._f('in', c, v); }
    match(obj) { Object.entries(obj).forEach(([k, v]) => this._f('eq', k, v)); return this; }
    order(col, { ascending = true } = {}) { this.b.order.push([col, ascending]); return this; }
    limit(n) { this.b.limit = n; return this; }
    single() { this.b.mode = 'single'; return this; }
    maybeSingle() { this.b.mode = 'maybe'; return this; }
    async _run() {
      const r = await request(`db/${this.t}`, { body: this.b });
      if (r.error) return { data: null, error: r.error, count: null };
      return { data: r.data?.data ?? null, error: null, count: r.data?.count ?? null };
    }
    then(onFulfilled, onRejected) { return this._run().then(onFulfilled, onRejected); }
  }

  // ------------------------------------------------------------------ files
  const encodePath = (p) => String(p).split('/').map(encodeURIComponent).join('/');
  const storage = {
    from(bucket) {
      return {
        async upload(path, file, opts = {}) {
          const form = new FormData();
          form.append('path', path);
          form.append('file', file);
          if (opts.upsert) form.append('upsert', 'true');
          const r = await request(`storage/${bucket}/upload`, { form });
          return r.error ? { data: null, error: r.error } : { data: { path }, error: null };
        },
        getPublicUrl(path) { return { data: { publicUrl: `${API}/storage/v1/object/public/${bucket}/${encodePath(path)}` } }; },
        async remove(paths) {
          const r = await request(`storage/${bucket}/remove`, { body: { paths } });
          return r.error ? { data: null, error: r.error } : { data: r.data, error: null };
        },
        async createSignedUrl(path, seconds = 3600) {
          const r = await request('storage/paid-files/sign', { body: { path, expiresIn: seconds } });
          return r.error ? { data: null, error: r.error } : { data: { signedUrl: r.data.signedUrl }, error: null };
        },
      };
    },
  };

  const functions = {
    async invoke(name, { body } = {}) {
      const r = await request(`fn/${name}`, { body: body ?? {} });
      if (r.error) return { data: null, error: { message: r.error.message, context: { status: r.status, json: async () => r.error.json || {} } } };
      return { data: r.data, error: null };
    },
  };

  const client = {
    auth,
    storage,
    functions,
    from: (table) => new Query(table),
    async rpc(name, args) {
      const r = await request(`rpc/${name}`, { body: args || {} });
      return r.error ? { data: null, error: r.error } : { data: r.data?.data ?? null, error: null };
    },
  };

  takeSessionFromUrl();
  return client;
}
