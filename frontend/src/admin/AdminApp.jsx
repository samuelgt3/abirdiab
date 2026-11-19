import { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { hasSupabase, supabase } from '../lib/supabase.js';
import AccountView from './AccountView.jsx';
import ActivityView from './ActivityView.jsx';
import ContentList from './ContentList.jsx';
import Dashboard from './Dashboard.jsx';
import OrdersView from './OrdersView.jsx';
import SettingsView from './SettingsView.jsx';
import StoriesView from './StoriesView.jsx';
import SubscribersView from './SubscribersView.jsx';
import AvailabilityView from './AvailabilityView.jsx';
import { Badge, Icon } from './ui.jsx';

const NAV = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true }] },
  { group: 'Sales', items: [
    { to: '/admin/orders', label: 'Bookings', icon: 'orders', badge: 'orders' },
    { to: '/admin/availability', label: 'Sessions & availability', icon: 'workshops' },
    { to: '/admin/subscribers', label: 'Subscribers', icon: 'mail' },
  ] },
  { group: 'Website content', items: [
    { to: '/admin/testimonials', label: 'Testimonials', icon: 'testimonials' },
    { to: '/admin/courses', label: 'Courses & materials', icon: 'courses' },
    { to: '/admin/workshops', label: 'Workshops', icon: 'workshops' },
    { to: '/admin/meditation_samples', label: 'Guided meditations', icon: 'headphones' },
    { to: '/admin/journal_posts', label: 'Journal', icon: 'journal' },
  ] },
  { group: 'Inbox', items: [{ to: '/admin/stories', label: 'Story submissions', icon: 'stories', badge: 'stories' }] },
  { group: 'Settings', items: [
    { to: '/admin/settings', label: 'Booking & payments', icon: 'settings' },
    { to: '/admin/activity', label: 'Activity log', icon: 'orders' },
    { to: '/admin/account', label: 'My account', icon: 'user' },
  ] },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setNote(''); setBusy(true);
    const r = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (r.error) setErr(/confirm/i.test(r.error.message) ? 'Please confirm your email first.' : 'That email and password do not match.');
  }
  async function forgot() {
    setErr(''); setNote('');
    if (!email.trim()) { setErr('Type your email above first, then press "Forgot password".'); return; }
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin` });
    setNote('If that email has an account, a reset link is on its way.');
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-[400px] px-4">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green text-cream"><Icon name="user" size={22} /></div>
        <h1 className="m-0 font-serif text-[1.8rem] font-normal">Abir Diab — Admin</h1>
        <p className="m-0 mt-1 text-[14px] text-ink/60">Sign in to manage your website</p>
      </div>
      <form onSubmit={submit} className="rounded-xl border border-green/15 bg-white p-6 shadow-[0_8px_30px_rgba(18,63,53,.08)]">
        <label className="label !mt-0" htmlFor="ad-email">Email</label>
        <input id="ad-email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label" htmlFor="ad-pass">Password</label>
        <div className="relative">
          <input id="ad-pass" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input pe-16" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShow(!show)} className="absolute end-2 top-1/2 -translate-y-1/2 px-2 text-[13px] text-green">{show ? 'Hide' : 'Show'}</button>
        </div>
        <p role="alert" className="mt-3 min-h-[1.4em] text-[14px] font-semibold text-danger">{err}</p>
        {note && <p role="status" className="mb-2 text-[14px] font-semibold text-green">{note}</p>}
        <button type="submit" className="btn-solid w-full !py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" onClick={forgot} className="mt-3 block w-full text-center text-[13.5px] text-green underline underline-offset-4">Forgot password?</button>
      </form>
    </div>
  );
}

function Sidebar({ counts, email, onNavigate }) {
  return (
    <nav aria-label="Admin" className="flex h-full flex-col bg-green text-cream">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/60 font-serif text-[14px] text-cream">AD</span>
        <div className="min-w-0 leading-tight">
          <div className="font-serif text-[16px]">Abir Diab</div>
          <div className="truncate text-[11.5px] text-cream/60" dir="ltr">{email}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-2">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-[.1em] text-cream/40">{g.group}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate}
                className={({ isActive }) => `relative mb-px flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] !text-cream no-underline transition ${isActive ? 'bg-cream/15 font-semibold before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-gold' : 'text-cream/85 hover:bg-cream/10'}`}>
                <Icon name={it.icon} size={17} className="opacity-90" />
                <span className="flex-1 leading-tight">{it.label}</span>
                {it.badge && counts[it.badge] > 0 && <span className="rounded-full bg-accent px-1.5 py-px text-[12px] font-bold text-ink">{counts[it.badge]}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 border-t border-cream/15 p-2.5">
        <a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] !text-cream no-underline hover:bg-cream/10">
          <Icon name="external" size={15} /> Website
        </a>
        <button type="button" onClick={() => supabase.auth.signOut()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] text-cream hover:bg-cream/10">
          <Icon name="logout" size={15} /> Sign out
        </button>
      </div>
    </nav>
  );
}

export default function AdminApp() {
  const { pathname } = useLocation();
  const [session, setSession] = useState(undefined); // undefined = checking
  const [isAdmin, setIsAdmin] = useState(undefined);
  const [toasts, setToasts] = useState([]);
  const [counts, setCounts] = useState({ orders: 0, stories: 0 });
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    document.title = 'Abir Diab — Admin';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then((r) => setSession(r.data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // customers can sign in on the public site too, so being signed in is not enough: ask the database
  useEffect(() => {
    if (!session) { setIsAdmin(undefined); return; }
    supabase.rpc('is_admin').then((r) => setIsAdmin(r.error ? false : r.data === true));
  }, [session]);

  const toast = useCallback((msg, isErr) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, isErr }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), isErr ? 7000 : 3500);
  }, []);

  // sidebar badge: new stories
  const loadCounts = useCallback(async () => {
    const [s, o] = await Promise.all([
      supabase.from('testimonial_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'), // paid, not yet marked Confirmed
    ]);
    setCounts({ orders: o.count || 0, stories: s.count || 0 });
  }, []);
  useEffect(() => {
    if (isAdmin !== true) return undefined;
    loadCounts();
    const id = setInterval(loadCounts, 60000);
    return () => clearInterval(id);
  }, [isAdmin, loadCounts, pathname]);

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [pathname]);

  let content;
  if (!hasSupabase) {
    content = (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-danger/30 bg-white p-6">
        <h2 className="mb-2 font-serif text-2xl">Admin is not connected yet</h2>
        <p>Copy <code>.env.example</code> to <code>.env.local</code>, paste the Supabase URL and anon key, then restart <code>npm run dev</code>. See <code>docs/SETUP.md</code>.</p>
      </div>
    );
  } else if (session === undefined) content = <p className="mt-16 text-center text-sm text-ink/60">Loading…</p>;
  else if (!session) content = <Login />;
  else if (isAdmin === undefined) content = <p className="mt-16 text-center text-sm text-ink/60">Checking access…</p>;
  else if (isAdmin === false) {
    content = (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-danger/30 bg-white p-6 text-center">
        <Icon name="alert" size={28} className="mx-auto mb-2 text-danger" />
        <h2 className="mb-2 font-serif text-2xl">No admin access</h2>
        <p className="mb-4 text-sm text-ink/70">{session.user.email} is not an administrator of this website.</p>
        <button type="button" className="btn-solid !py-2" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  const shell = isAdmin === true;
  return (
    <div className="min-h-screen bg-[#f5f3ee] font-sans text-ink">
      {shell ? (
        <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="sticky top-0 hidden h-screen lg:block"><Sidebar counts={counts} email={session.user.email} /></aside>
          <header className="sticky top-0 z-[60] flex items-center gap-3 bg-green px-4 py-3 text-cream lg:hidden">
            <button type="button" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)} className="rounded-lg p-1.5 hover:bg-cream/10"><Icon name="menu" size={22} /></button>
            <span className="font-serif text-[17px]">Abir Diab · Admin</span>
            {(counts.orders > 0 || counts.stories > 0) && <Badge tone="amber" className="ms-auto">{counts.orders + counts.stories} to check</Badge>}
          </header>
          {menu && (
            <div className="fixed inset-0 z-[200] lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
              <div className="absolute inset-0 bg-ink/50" aria-hidden="true" onClick={() => setMenu(false)} />
              <div className="absolute inset-y-0 start-0 w-[270px] max-w-[85vw]"><Sidebar counts={counts} email={session.user.email} onNavigate={() => setMenu(false)} /></div>
            </div>
          )}
          <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1100px]">
              <Routes>
                <Route index element={<Dashboard toast={toast} />} />
                <Route path="orders" element={<OrdersView toast={toast} onChanged={loadCounts} />} />
                <Route path="subscribers" element={<SubscribersView toast={toast} />} />
              <Route path="availability" element={<AvailabilityView toast={toast} />} />
                <Route path="stories" element={<StoriesView toast={toast} onChanged={loadCounts} />} />
                <Route path="settings" element={<SettingsView toast={toast} />} />
                <Route path="account" element={<AccountView session={session} toast={toast} />} />
                <Route path="activity" element={<ActivityView />} />
                <Route path=":table" element={<ContentList toast={toast} />} />
              </Routes>
            </div>
          </main>
        </div>
      ) : content}
      <div className="fixed bottom-5 left-1/2 z-[400] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex max-w-[90vw] items-center gap-2 rounded-xl px-4 py-2.5 text-white shadow-lg ${t.isErr ? 'bg-danger' : 'bg-green'}`}>
            <Icon name={t.isErr ? 'alert' : 'check'} size={16} />{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
