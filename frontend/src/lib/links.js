const WA = import.meta.env.VITE_WHATSAPP || '201080736170';
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@abirdiab.com';
export const SOCIAL = {
  instagram: 'https://instagram.com/abir_diaab',
  youtube: 'https://youtube.com/@Abir_Diab',
  tiktok: 'https://tiktok.com/@.abir.diab',
};
/** The two videos in "Watch & Listen": YouTube id and the part that plays (seconds from the start of the video). */
export const WATCH_VIDEOS = [
  { id: 'BEyRjrJnG9M', start: 0, end: 80 },  // 0:00 - 1:20
  { id: 'wJ6uagpLRyw', start: 5, end: 60 },  // 0:05 - 1:00
];

/** The embed address for one of them; it stops by itself at the end time. */
export const watchSrc = (v) =>
  `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&start=${v.start}&end=${v.end}&rel=0&modestbranding=1&playsinline=1`;
export const WHATSAPP_DISPLAY = '+20 108 073 6170';

/** WhatsApp link with an optional pre-filled message. */
export const whatsapp = (text) => `https://wa.me/${WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const mailto = (subject) => `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
