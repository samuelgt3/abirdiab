import { useEffect, useRef, useState } from 'react';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { SOCIAL, WATCH_VIDEOS } from '../lib/links.js';
import ClipPlayer from './ClipPlayer.jsx';
import { InstagramIcon, PlayIcon, TikTokIcon, YouTubeIcon } from './Icons.jsx';

const img = (n) => `${import.meta.env.BASE_URL}images/${n}`;

const PauseIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
);

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Meditation() {
  const { t, lang, content, pick } = useSite();
  const m = t.meditations;
  // from the database (editable in Admin -> Guided meditations); the bundled three are only the fallback
  const rows = content?.meditation_samples?.length
    ? content.meditation_samples
    : m.samples.map((s) => ({ ...s, id: s.title }));

  const audio = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ cur: 0, dur: 0 });
  const [failed, setFailed] = useState(null);

  useEffect(() => () => { audio.current?.pause(); }, []);

  function toggle(row) {
    const el = audio.current;
    if (!el) return;
    if (activeId === row.id) {
      if (el.paused) el.play().catch(() => setFailed(row.id)); else el.pause();
      return;
    }
    // a different voice: the single player switches over, so only one ever plays
    setFailed(null);
    setActiveId(row.id);
    setPos({ cur: 0, dur: 0 });
    el.src = assetUrl(row.audio_url);
    el.play().catch(() => setFailed(row.id));
  }

  return (
    <section id="meditations" className="section-pad scroll-mt-16">
      <div className="container-x grid items-center gap-12 md:grid-cols-[minmax(0,380px)_1fr]">
        <div className="mx-auto w-full max-w-[220px] md:max-w-none">
          <div className="arch aspect-[3/3.4] overflow-hidden shadow-[0_20px_40px_rgba(18,63,53,.14)]">
            <img loading="lazy" src={img('pendulum-gold-sand.jpg')} alt={lang === 'ar' ? "بندول يرسم أنماطاً في رمل ذهبي" : "A pendulum tracing patterns through gold sand"} className="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <div className="kicker mb-3">{m.kicker}</div>
          <h2 className="mb-5 font-serif text-[2rem] font-normal leading-tight text-ink md:text-[2.6rem]">{m.title}</h2>
          <p className="mb-7 max-w-xl text-[16.5px] leading-[1.75] text-ink/70">{m.body}</p>

          <audio ref={audio} preload="none"
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setActiveId(null); }}
            onLoadedMetadata={(e) => { const dur = e.currentTarget.duration || 0; setPos((p) => ({ ...p, dur })); }}
            onTimeUpdate={(e) => setPos({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 })}
            onError={() => setFailed(activeId)} />

          <ul className="divide-y divide-green/10 border-y border-green/10">
            {rows.map((s) => {
              const on = activeId === s.id;
              const isPlaying = on && playing;
              const body = (
                <>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full !text-cream ${s.audio_url ? 'bg-green' : 'bg-green/35'}`}>
                    {isPlaying ? <PauseIcon /> : <PlayIcon size={13} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{pick(s, 'title')}</span>
                    <span className="block text-[13px] text-ink/75">{failed === s.id ? m.playFailed : pick(s, 'note')}</span>
                    {!s.audio_url && <span className="block text-[12px] italic text-ink/75">{m.soon}</span>}
                    {on && pos.dur > 0 && (
                      <span className="mt-2 flex items-center gap-2.5" dir="ltr">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-green/15"><span className="block h-full rounded-full bg-green" style={{ width: `${Math.min(100, (pos.cur / pos.dur) * 100)}%` }} /></span>
                        <span className="text-[12px] tabular-nums text-ink/75">{clock(pos.cur)} / {clock(pos.dur)}</span>
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-ink/75">{pick(s, 'duration')}</span>
                </>
              );
              // the voice plays right here; a meditation without audio yet is shown but does nothing (it never leads anywhere)
              return (
                <li key={s.id}>
                  {s.audio_url ? (
                    <button type="button" onClick={() => toggle(s)} aria-pressed={isPlaying} aria-label={`${isPlaying ? m.pause : m.play}: ${pick(s, 'title')}`}
                      className={`flex w-full items-center gap-4 py-3.5 text-start hover:bg-green/[.03] ${on ? 'bg-green/[.04]' : ''}`}>{body}</button>
                  ) : (
                    <div aria-disabled="true" className="flex cursor-default items-center gap-4 py-3.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[13px] text-ink/75">{m.sampleNote}</p>
        </div>
      </div>
    </section>
  );
}

function VideoTile({ video, image, alt, label, labels, playing, onPlay, onFail, className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      {playing ? (
        <ClipPlayer video={video} title={label} labels={labels} onFail={onFail} />
      ) : (
        <button type="button" onClick={onPlay} className="group absolute inset-0 text-start" aria-label={label}>
          <img loading="lazy" src={image} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/95 text-green shadow-lg">
            <PlayIcon size={20} />
          </span>
          <span className="absolute bottom-4 start-5 text-[13.5px] text-cream">{label}</span>
        </button>
      )}
    </div>
  );
}

function Watch() {
  const { t, lang } = useSite();
  const w = t.watch;
  // only one video plays at a time: starting one stops the other
  const [active, setActive] = useState(null);
  const pill = 'inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-[13.5px] !text-cream no-underline hover:bg-cream/10';
  return (
    <section id="watch" className="scroll-mt-16 overflow-hidden bg-green text-cream">
      <div className="container-x grid items-center gap-9 px-6 py-12 md:px-10 md:py-[72px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <div className="mb-3 text-[12.5px] uppercase tracking-[.08em] text-[#F2A877]">{w.kicker}</div>
          <h2 className="mb-5 font-serif text-[2rem] font-normal md:text-[2.6rem]">{w.title}</h2>
          <p className="mb-7 max-w-md text-[16px] leading-relaxed text-cream/80">{w.body}</p>
          <div className="flex flex-wrap gap-2.5">
            <a className={pill} href={SOCIAL.instagram} target="_blank" rel="noopener"><InstagramIcon /> Instagram</a>
            <a className={pill} href={SOCIAL.youtube} target="_blank" rel="noopener"><YouTubeIcon /> YouTube</a>
            <a className={pill} href={SOCIAL.tiktok} target="_blank" rel="noopener"><TikTokIcon /> TikTok</a>
          </div>
        </div>
        <div className="grid gap-5">
          <VideoTile className="aspect-video w-full rounded-xl" video={WATCH_VIDEOS[0]} image={img('podcast.jpg')} alt={lang === 'ar' ? "عبير دياب في مقابلة بودكاست عن عملها" : "Abir Diab being interviewed on a podcast about her practice"} label={w.ytLabel}
            labels={w} playing={active === 'a'} onPlay={() => setActive('a')} onFail={() => setActive(null)} />
          <VideoTile className="aspect-video w-full rounded-xl" video={WATCH_VIDEOS[1]} image={img('conversation.jpg')} alt={lang === 'ar' ? "عبير دياب تتحدث في حوار مصوّر عن الطاقة والشفاء" : "Abir Diab speaking during a filmed conversation about energy healing"} label={w.secondVideoTitle}
            labels={w} playing={active === 'b'} onPlay={() => setActive('b')} onFail={() => setActive(null)} />
        </div>
      </div>
    </section>
  );
}

export default function Meditations() {
  return <Meditation />;
}

export { Watch };
