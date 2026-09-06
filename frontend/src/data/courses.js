import { DEFAULT_COURSES } from './default-courses.js';
import { withIds } from './utils.js';

export { DEFAULT_COURSES, withIds };

/** Resolve a stored course's language-specific fields (the *Ar variants were
 * added directly on each course record rather than in the EN/AR translation
 * tables, matching the original design). */
export function localizeCourse(c, lang) {
  const ar = lang === 'ar';
  return {
    ...c,
    category: ar && c.categoryAr ? c.categoryAr : c.category,
    title: ar && c.titleAr ? c.titleAr : c.title,
    desc: ar && c.descAr ? c.descAr : c.desc,
    full: ar && c.fullAr ? c.fullAr : c.full,
    meta: ar && c.metaAr ? c.metaAr : c.meta,
    badge: ar && c.badgeAr ? c.badgeAr : c.badge,
    whatYouGet: ar && c.whatYouGetAr ? c.whatYouGetAr : c.whatYouGet,
    type: ar ? (c.type === 'Video' ? 'فيديو' : c.type === 'Audio' ? 'صوتي' : 'PDF') : c.type,
  };
}
