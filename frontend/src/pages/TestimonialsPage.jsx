import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout, { BackLink } from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { PlayIcon } from '../components/Icons.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { useCheckout } from '../components/checkout/CheckoutContext.jsx';

export const GRADIENTS = [
  'linear-gradient(135deg,#DD8452,#C1922F)',
  'linear-gradient(135deg,#123F35,#1D5B4C)',
  'linear-gradient(135deg,#C06B3C,#16211D)',
  'linear-gradient(135deg,#1D5B4C,#C1922F)',
];
const KINDS = ['all', 'written', 'voice', 'screenshot'];
// fixed pseudo-waveform so the bars look the same on every render
const BARS = Array.from({ length: 36 }, (_, i) => 30 + Math.round(60 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6))));

const card = 'rounded-md border border-cream/[.12] bg-cream/[.06]';

function Person({ x, i }) {
  const { pick } = useSite();
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 rounded-full" style={{ background: GRADIENTS[i % GRADIENTS.length] }} />
      <div>
        <div className="font-serif text-[15.5px] text-cream">{pick(x, 'name')}</div>
        <div className="text-[13px] text-gold-soft">{pick(x, 'role')}</div>
      </div>
    </div>
  );
}

function VoiceCard({ x, i }) {
  const { t, pick } = useSite();
  const q = t.testimonials;
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tx, setTx] = useState(false);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };
  return (
    <div className={`${card} flex flex-col gap-4 p-[22px]`}>
      <Person x={x} i={i} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} disabled={!x.audio_url} aria-label={playing ? q.pause : q.play}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink disabled:opacity-40">
          {playing ? <span className="text-sm font-bold">❚❚</span> : <PlayIcon size={15} />}
        </button>
        <div dir="ltr" className="flex h-8 flex-1 items-center gap-[2px]" aria-hidden="true">
          {BARS.map((h, k) => (
            <span key={k} className="flex-1 rounded-md" style={{ height: `${h}%`, background: k / BARS.length < progress ? '#DD8452' : 'rgba(253,251,246,.28)' }} />
          ))}
        </div>
      </div>
      {x.audio_url && (
        <audio ref={audio} preload="none" src={assetUrl(x.audio_url)}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} />
      )}
      <div className="text-[14.5px] leading-[1.65] text-cream/80">{pick(x, 'summary')}</div>
      {pick(x, 'quote') && (
        <>
          <button type="button" onClick={() => setTx(!tx)} aria-expanded={tx} className="inline-flex items-center self-start text-[13.5px] text-sand underline underline-offset-4 max-md:min-h-[44px]">
            {tx ? q.hideTx : q.showTx}
          </button>
          {tx && <p className="m-0 text-[14.5px] italic leading-relaxed text-cream/75">“{pick(x, 'quote')}”</p>}
        </>
      )}
    </div>
  );
}

export default function TestimonialsPage() {
  const { t, u, lang, content, pick } = useSite();
  const { shareStory } = useCheckout();
  const q = t.testimonials;
  const [params, setParams] = useSearchParams();
  const kind = KINDS.includes(params.get('kind')) ? params.get('kind') : 'all';
  const service = params.get('service') || '';
  const [shot, setShot] = useState(null);
  const [broken, setBroken] = useState({});

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const all = content?.testimonials || [];
  // services keyed by the English role so the filter survives a language switch
  const services = [...new Map(all.filter((x) => x.role).map((x) => [x.role, pick(x, 'role')])).entries()];
  const inService = all.filter((x) => !service || x.role === service);
  const show = (k) => kind === 'all' || kind === k;
  const written = inService.filter((x) => x.kind === 'written');
  const voice = inService.filter((x) => x.kind === 'voice');
  const shots = inService.filter((x) => x.kind === 'screenshot');
  const nothing = (!show('written') || !written.length) && (!show('voice') || !voice.length) && (!show('screenshot') || !shots.length);

  const tabs = [['all', q.tabAll], ['written', q.tabWritten], ['voice', q.tabVoice], ['screenshot', q.tabShots]];
  const h3 = 'mb-[18px] font-serif text-[1.6rem] font-normal text-cream';

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(158deg,#0a1a15_0%,#123F35_58%,#1D5B4C_100%)]">
        <img src={`${import.meta.env.BASE_URL}images/pendulum-set.jpg`} alt="" aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.08] mix-blend-luminosity" />
        <div className="container-x relative px-5 pb-24 pt-9 md:px-8">
          <div className="mb-7"><BackLink to="/#testimonials" label={q.back} light /></div>
          <header className="mb-9 text-center">
            <div className="mb-3 text-[12.5px] uppercase tracking-[.08em] text-[#F2A877]">{q.kicker}</div>
            <h1 className="mb-3.5 font-serif text-[2rem] font-normal text-cream md:text-[2.7rem]">{q.pageTitle}</h1>
            <p className="mx-auto max-w-[560px] text-[15.5px] leading-[1.7] text-cream/70">{q.pageLead}</p>
          </header>

          <div className="mb-5 flex flex-wrap justify-center gap-2" role="group" aria-label={q.title}>
            {tabs.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => set('kind', k)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold leading-none transition max-md:min-h-[44px] ${kind === k ? 'border-accent bg-accent text-ink' : 'border-cream/30 text-cream hover:bg-cream/10'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mb-11 flex flex-wrap items-center justify-center gap-2.5 text-[13.5px] text-cream/75">
            <label htmlFor="svc">{q.byService}</label>
            <select id="svc" value={service} onChange={(e) => set('service', e.target.value)}
              className="rounded-full border border-cream/30 bg-[#0f2a23] px-3.5 py-2 text-cream">
              <option value="">{q.allServices}</option>
              {services.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          {!content && <p className="text-center text-cream/60">{u.loading}</p>}
          {content && nothing && <p className="py-10 text-center text-cream/60">{q.empty}</p>}

          {show('written') && written.length > 0 && (
            <section className="mb-[52px]">
              {kind === 'all' && <h2 className={h3}>{q.tabWritten}</h2>}
              <div className="grid gap-5 md:grid-cols-2">
                {written.map((x, i) => (
                  <figure key={x.id ?? x.name} className={`${card} m-0 p-6`}>
                    <Person x={x} i={i} />
                    <blockquote className="m-0 mt-3.5 text-[15.5px] leading-[1.7] text-cream/85">“{pick(x, 'quote')}”</blockquote>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {show('voice') && voice.length > 0 && (
            <section className="mb-[52px]">
              <h2 className={h3}>{q.tabVoice}</h2>
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
                {voice.map((x, i) => <VoiceCard key={x.id ?? x.name} x={x} i={i + 1} />)}
              </div>
            </section>
          )}

          {show('screenshot') && shots.length > 0 && (
            <section className="mb-[52px]">
              <h2 className={h3}>{q.tabShots}</h2>
              <div className="grid grid-cols-2 gap-5 sm:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                {shots.map((x) => {
                  const key = x.id ?? x.name;
                  const src = assetUrl(lang === 'ar' && x.image_url_ar ? x.image_url_ar : x.image_url);
                  return (
                    <figure key={key} className="m-0 flex flex-col gap-2.5">
                      <button type="button" onClick={() => src && !broken[key] && setShot({ src, x })} aria-label={`${q.enlarge}: ${pick(x, 'name')}`}
                        className={`${card} relative aspect-[9/16] overflow-hidden`}>
                        {src && !broken[key] ? (
                          <img loading="lazy" src={src} alt={`${pick(x, 'name')} — ${pick(x, 'via')}`} onError={() => setBroken((b) => ({ ...b, [key]: true }))}
                            className="h-full w-full object-contain" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center p-4 text-sm text-cream/50">{pick(x, 'via')}</span>
                        )}
                      </button>
                      <figcaption className="text-[13.5px] leading-normal text-cream/70"><span className="text-cream">{pick(x, 'name')}</span> · {pick(x, 'via')}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-5 border-t border-cream/15 pt-10 text-center">
            <h2 className="mb-2.5 font-serif text-[1.8rem] font-normal text-cream">{q.shareTitle}</h2>
            <p className="mx-auto mb-6 max-w-[520px] text-[15.5px] leading-[1.7] text-cream/70">{q.shareLead}</p>
            <button type="button" onClick={shareStory} className="btn-accent">{q.shareBtn}</button>
          </section>
        </div>
      </div>

      <Modal open={!!shot} onClose={() => setShot(null)} title={shot ? pick(shot.x, 'name') : ''} closeLabel={q.closeLbl}>
        {shot && (
          <figure className="m-0 text-center">
            <img src={shot.src} alt={`${pick(shot.x, 'name')} — ${pick(shot.x, 'via')}`} className="mx-auto max-h-[calc(var(--vh)*72)] rounded-xl" />
            <figcaption className="mt-3 text-sm"><strong>{pick(shot.x, 'name')}</strong> · {pick(shot.x, 'via')}</figcaption>
          </figure>
        )}
      </Modal>
    </Layout>
  );
}
