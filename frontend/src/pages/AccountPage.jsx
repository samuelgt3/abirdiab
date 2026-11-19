import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import QuickAccess, { clearPending, readPending } from '../components/QuickAccess.jsx';
import acct from '../content/account.json';
import pageCopy from '../content/accountPage.json';
import { useCheckout } from '../components/checkout/CheckoutContext.jsx';
import { useAuth } from '../hooks/AuthContext.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { splitBookings } from '../lib/account.js';
import { getProgress, indexProgress, setLessonDone } from '../lib/learning.js';
import { getMyDisplayName, getMyGifts, getMyLibrary, getMyOrders } from '../lib/orders.js';
import BookingsList from './account/BookingsList.jsx';
import CourseView from './account/CourseView.jsx';
import GiftsTab from './account/GiftsTab.jsx';
import LearningTab from './account/LearningTab.jsx';
import NavIcon from './account/NavIcon.jsx';
import ProfileTab from './account/ProfileTab.jsx';

const TABS = ['sessions', 'workshops', 'learning', 'gifts', 'settings'];

/** /account — bookings, courses, gifts and settings. Plain and quiet (needs sign-in). */
export default function AccountPage() {
  const { lang, kindLabel, pick } = useSite();
  const { user, ready, name: accountName, openAuth, signOut, claimTick } = useAuth();
  // the saved name; if the account has none, the name on the latest booking. An email address is never shown as a name.
  const [bookingName, setBookingName] = useState('');
  useEffect(() => {
    if (!user || accountName) { setBookingName(''); return undefined; }
    let alive = true;
    getMyDisplayName().then((n) => alive && setBookingName(n));
    return () => { alive = false; };
  }, [user, accountName, claimTick]);
  const name = accountName || bookingName;
  const { bookSession } = useCheckout();
  const a = acct[lang].account;
  const p = pageCopy[lang];
  const [params, setParams] = useSearchParams();
  // old links: ?tab=courses is now "My learning", ?tab=bookings is now "1:1 Session"
  const rawTab = params.get('tab');
  const tabParam = rawTab === 'courses' ? 'learning' : rawTab === 'bookings' ? 'sessions' : rawTab;
  const tab = TABS.includes(tabParam) ? tabParam : 'learning';
  const openCourseId = tab === 'learning' ? params.get('course') : null;

  // a guest who just booked and pressed "View my booking": a one-step password screen instead of the usual sign-up
  const [pending, setPending] = useState(() => readPending());
  useEffect(() => { if (user) { clearPending(); setPending(null); } }, [user]);

  const [orders, setOrders] = useState(null);
  const [library, setLibrary] = useState(null);
  const [gifts, setGifts] = useState(null);
  const [progress, setProgress] = useState({ done: [], opened: [] });

  useEffect(() => {
    if (!user) { setOrders(null); setLibrary(null); setGifts(null); setProgress({ done: [], opened: [] }); return undefined; }
    let alive = true;
    getMyOrders().then((o) => alive && setOrders(o.filter((x) => (x.kind === 'session' || x.kind === 'workshop') && x.paid)));
    getMyLibrary().then((l) => alive && setLibrary(l));
    getMyGifts().then((g) => alive && setGifts(g));
    getProgress().then((x) => alive && setProgress(x));
    return () => { alive = false; };
  }, [user, claimTick]);

  const upcomingOf = (k) => splitBookings((orders || []).filter((o) => o.kind === k)).upcoming.length;
  const idx = useMemo(() => indexProgress(progress), [progress]);
  const data = { orders, library, gifts, idx };
  const openCourse = openCourseId && library ? library.find((c) => c.id === openCourseId) : null;

  /** Tick or untick a lesson: the page updates at once, and goes back if saving fails. */
  const toggleLesson = useCallback(async (courseId, key, done) => {
    const before = progress;
    const now = new Date().toISOString();
    setProgress((cur) => ({
      opened: [...cur.opened.filter((o) => o.course_id !== courseId), { course_id: courseId, at: now }],
      done: done ? [...cur.done.filter((d) => !(d.course_id === courseId && d.key === key)), { course_id: courseId, key, at: now }]
        : cur.done.filter((d) => !(d.course_id === courseId && d.key === key)),
    }));
    const ok = await setLessonDone(courseId, key, done);
    if (!ok) setProgress(before);
    return ok;
  }, [progress]);
  const first = (name || '').trim().split(/\s+/)[0];
  const counts = { sessions: upcomingOf('session'), workshops: upcomingOf('workshop') };
  const inCourse = tab === 'learning' && !!openCourseId;

  return (
    <Layout>
      <section className="mx-auto max-w-[1120px] px-5 py-8 md:py-12">
        {!ready && <p className="text-ink/75">…</p>}
        {ready && !user && pending && (
          <div className="py-6 md:py-10"><QuickAccess pending={pending} onDone={() => setPending(null)} /></div>
        )}
        {ready && !user && !pending && (
          <div className="mx-auto max-w-md py-10 text-center">
            <h1 className="mb-3 font-serif text-[2rem] font-normal text-ink">{a.title}</h1>
            <p className="mb-6 text-ink/70">{a.signInNeeded}</p>
            <button type="button" className="btn-solid" onClick={() => openAuth({ mode: 'in' })}>{acct[lang].signIn}</button>
          </div>
        )}

        {user && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[250px_minmax(0,1fr)] md:gap-9">
            {/* left menu (a swipeable row of tabs on phones) */}
            <aside className="min-w-0 md:sticky md:top-[calc(var(--hdr-h,64px)+20px)] md:self-start">
              <div className="mb-4 hidden items-center gap-3 rounded-2xl bg-green p-4 text-cream md:flex">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/60 font-serif text-[1.3rem]" aria-hidden="true">{(first || user?.email || '?').charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{name || a.title}</div>
                  <div dir="ltr" className="truncate text-[12.5px] text-cream/70" style={{ textAlign: 'start' }}>{user.email}</div>
                </div>
              </div>
              <nav aria-label={p.nav.label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                {TABS.map((k) => {
                  const on = tab === k;
                  return (
                    <button key={k} type="button" onClick={() => setParams(k === 'learning' ? {} : { tab: k })} aria-current={on ? 'page' : undefined}
                      className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-[15px] transition md:rounded-xl md:py-3 ${on ? 'bg-green font-semibold text-cream' : 'bg-green/[.07] text-ink hover:bg-green/15 md:bg-transparent'}`}>
                      <NavIcon name={k} size={18} />
                      <span className="flex-1 text-start">{p.nav[k]}</span>
                      {counts[k] > 0 && <span className={`rounded-full px-2 text-[12px] font-semibold ${on ? 'bg-cream/25' : 'bg-green/15 text-green'}`}>{counts[k]}</span>}
                    </button>
                  );
                })}
              </nav>
              <button type="button" onClick={signOut} className="mt-4 hidden items-center gap-3 rounded-xl px-4 py-2.5 text-[14.5px] text-ink/75 transition hover:bg-green/10 hover:text-green md:flex">
                <NavIcon name="logout" size={18} />{acct[lang].signOut}
              </button>
            </aside>

            {/* the page next to it */}
            <main className="min-w-0">
              {!inCourse && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h1 className="m-0 font-serif text-[1.8rem] font-normal text-ink">{p.titles[tab]}</h1>
                  {tab === 'sessions' && <button type="button" onClick={bookSession} className="btn-solid !gap-2 !py-2.5 !text-[14.5px]"><NavIcon name="plus" size={16} />{p.book}</button>}
                  {tab === 'workshops' && <Link to="/#workshop" className="btn-outline !py-2 !text-[14px] no-underline">{p.seeWorkshops}</Link>}
                  {tab === 'learning' && library?.length > 0 && <Link to="/materials" className="btn-outline !py-2 !text-[14px] no-underline">{p.learn.browse}</Link>}
                </div>
              )}

              {tab === 'learning' && !openCourseId && <LearningTab p={p} lang={lang} first={first} kindLabel={kindLabel} pick={pick} data={data} onOpen={(id) => { setParams({ course: id }); window.scrollTo({ top: 0 }); }} />}
              {tab === 'learning' && openCourseId && !library && <p className="text-ink/75">…</p>}
              {tab === 'learning' && openCourseId && library && !openCourse && <LearningTab p={p} lang={lang} first={first} kindLabel={kindLabel} pick={pick} data={data} onOpen={(id) => setParams({ course: id })} />}
              {tab === 'learning' && openCourse && (
                <CourseView course={openCourse} p={p} a={a} lang={lang} kindLabel={kindLabel} pick={pick} name={name || ''} idx={idx}
                  onBack={() => { setParams({}); window.scrollTo({ top: 0 }); }} onToggle={toggleLesson} />
              )}
              {(tab === 'sessions' || tab === 'workshops') && <BookingsList key={tab} p={p} lang={lang} kind={tab === 'sessions' ? 'session' : 'workshop'} orders={orders} />}
              {tab === 'gifts' && <GiftsTab p={p} a={a} lang={lang} data={data} />}
              {tab === 'settings' && <ProfileTab p={p} user={user} name={name} />}
            </main>
          </div>
        )}
      </section>
    </Layout>
  );
}
