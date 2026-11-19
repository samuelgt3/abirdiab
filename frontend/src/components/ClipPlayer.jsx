import { useCallback, useEffect, useRef, useState } from 'react';

/** Where are we inside the clip? progress 0..1 across ONLY the chosen part of the video. */
export function clipState(t, start, end) {
  const len = Math.max(1, end - start);
  if (t >= end - 0.25) return { phase: 'ended', progress: 1, seconds: len };
  if (t < start - 0.5) return { phase: 'before', progress: 0, seconds: 0 };
  const seconds = Math.max(0, t - start);
  return { phase: 'playing', progress: Math.min(1, seconds / len), seconds };
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let apiPromise;
/** Loads YouTube's player script once. */
function loadYouTube() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { apiPromise = null; reject(new Error('youtube script blocked')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

/**
 * Plays ONLY the part of a YouTube video from `start` to `end` (seconds). YouTube's own controls are switched off, so the
 * viewer cannot see or reach the rest of the video: we show our own play / pause, a bar that covers just the clip, and a
 * replay button when it finishes. If YouTube cannot load, `onFail` is called.
 * labels = { play, pause, replay }
 */
export default function ClipPlayer({ video, title, labels, onFail }) {
  const host = useRef(null);
  const player = useRef(null);
  const timer = useRef(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState({ phase: 'before', progress: 0, seconds: 0 });
  const len = video.end - video.start;

  useEffect(() => {
    let dead = false;
    loadYouTube().then((YT) => {
      if (dead || !host.current) return;
      const mount = document.createElement('div');
      host.current.appendChild(mount);
      player.current = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com',
        videoId: video.id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0,
          start: video.start, end: video.end,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => setPlaying(e.data === YT.PlayerState.PLAYING),
          onError: () => onFail?.(),
        },
      });
    }).catch(() => onFail?.());
    return () => { dead = true; clearInterval(timer.current); try { player.current?.destroy(); } catch { /* already gone */ } };
  }, [video.id, video.start, video.end, onFail]);

  // keep the picture inside the chosen part, and update our bar
  useEffect(() => {
    if (!ready) return undefined;
    timer.current = setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const t = p.getCurrentTime();
      const s = clipState(t, video.start, video.end);
      if (s.phase === 'ended') {
        p.pauseVideo();
        p.seekTo(video.start, true);
        setView({ phase: 'ended', progress: 1, seconds: len });
      } else if (s.phase === 'before') {
        p.seekTo(video.start, true);
      } else {
        setView(s);
      }
    }, 200);
    return () => clearInterval(timer.current);
  }, [ready, video.start, video.end, len]);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (view.phase === 'ended') { setView({ phase: 'playing', progress: 0, seconds: 0 }); p.seekTo(video.start, true); p.playVideo(); return; }
    if (playing) p.pauseVideo(); else p.playVideo();
  }, [playing, view.phase, video.start]);

  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const x = rtl ? r.right - e.clientX : e.clientX - r.left;
    const f = Math.min(1, Math.max(0, x / r.width));
    player.current?.seekTo(video.start + f * len, true);
    setView({ phase: 'playing', progress: f, seconds: f * len });
  };

  const ended = view.phase === 'ended';
  return (
    <div className="absolute inset-0 bg-black">
      <div ref={host} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" title={title} />
      {/* covers the video so YouTube's own title, logo and "watch on YouTube" can never be clicked */}
      <button type="button" onClick={toggle} aria-label={ended ? labels.replay : playing ? labels.pause : labels.play} className="absolute inset-0 z-10 cursor-pointer bg-transparent" />
      {(!playing || ended) && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/95 text-green shadow-lg" aria-hidden="true">
          {ended ? '↻' : '▶'}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-6 text-cream" dir="ltr">
        <button type="button" onClick={toggle} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/90 text-green" aria-label={ended ? labels.replay : playing ? labels.pause : labels.play}>
          {ended ? '↻' : playing ? '❚❚' : '▶'}
        </button>
        <div className="h-2 flex-1 cursor-pointer rounded-full bg-cream/30" onClick={seek} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.progress * 100)}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${view.progress * 100}%` }} />
        </div>
        <span className="shrink-0 text-[12px] tabular-nums">{clock(view.seconds)} / {clock(len)}</span>
      </div>
    </div>
  );
}
