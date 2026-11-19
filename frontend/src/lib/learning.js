import { supabase } from './supabase.js';

/** A course without a lesson list is tracked as one single item. */
export const COURSE_KEY = '__course__';

// ------------------------------------------------------------------ server calls
export async function getProgress() {
  if (!supabase) return { done: [], opened: [] };
  const { data, error } = await supabase.rpc('my_progress');
  if (error) { console.warn('[progress]', error.message); return { done: [], opened: [] }; }
  return data || { done: [], opened: [] };
}

export async function setLessonDone(courseId, key, done) {
  if (!supabase) return false;
  const { error } = await supabase.rpc('set_lesson_done', { p_course: courseId, p_key: key, p_done: done });
  if (error) { console.warn('[lesson]', error.message); return false; }
  return true;
}

export async function touchCourse(courseId) {
  if (supabase) await supabase.rpc('touch_course', { p_course: courseId });
}

// ------------------------------------------------------------------ pure logic
/** Progress is remembered by the lesson's title, so re-ordering lessons in the admin never moves a tick. */
export const lessonKey = (item) => String(item?.title || '').trim().toLowerCase();

/** The course's lessons as a plain list (empty when the course has no lesson list). */
export function lessonsOf(course) {
  const items = Array.isArray(course?.pack_items) ? course.pack_items : [];
  return items.filter((i) => i && i.title).map((i) => ({ ...i, key: lessonKey(i) }));
}

/** Turns the server's rows into quick lookups. */
export function indexProgress(raw) {
  const done = new Map(); // course_id -> Map(key -> iso)
  for (const r of raw?.done || []) {
    if (!done.has(r.course_id)) done.set(r.course_id, new Map());
    done.get(r.course_id).set(r.key, r.at);
  }
  const opened = new Map((raw?.opened || []).map((r) => [r.course_id, new Date(r.at).getTime()]));
  return { done, opened };
}

/** { total, done, pct, status: notStarted | inProgress | completed, next (first lesson not done), completedAt, single } */
export function courseProgress(course, idx) {
  const marks = idx.done.get(course.id) || new Map();
  const lessons = lessonsOf(course);
  if (lessons.length === 0) {
    const at = marks.get(COURSE_KEY) || null;
    return { total: 1, done: at ? 1 : 0, pct: at ? 100 : 0, status: at ? 'completed' : 'notStarted', next: null, completedAt: at, single: true };
  }
  const doneLessons = lessons.filter((l) => marks.has(l.key));
  const done = doneLessons.length;
  const status = done === lessons.length ? 'completed' : done > 0 ? 'inProgress' : 'notStarted';
  const completedAt = status === 'completed'
    ? doneLessons.map((l) => marks.get(l.key)).sort().pop()
    : null;
  return { total: lessons.length, done, pct: Math.round((done / lessons.length) * 100), status, next: lessons.find((l) => !marks.has(l.key)) || null, completedAt, single: false };
}

/** The course to offer under "Continue": most recently opened that is not finished; else the first one in progress; else the first not started. */
export function pickContinue(library, idx) {
  const open = (library || []).map((c) => ({ c, pr: courseProgress(c, idx) })).filter((x) => x.pr.status !== 'completed');
  if (!open.length) return null;
  const byRecent = [...open].sort((a, b) => (idx.opened.get(b.c.id) || 0) - (idx.opened.get(a.c.id) || 0));
  if (idx.opened.get(byRecent[0].c.id)) return byRecent[0];
  return open.find((x) => x.pr.status === 'inProgress') || open[0];
}

/** Counts for the filter buttons. */
export function countByStatus(library, idx) {
  const out = { all: 0, inProgress: 0, notStarted: 0, completed: 0 };
  for (const c of library || []) { out.all += 1; out[courseProgress(c, idx).status] += 1; }
  return out;
}

// ------------------------------------------------------------------ certificate
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A printable certificate of completion. All text is escaped. labels = { title, certify, completed, on, from, signed } */
export function certificateHtml({ name, course, dateIso, lang = 'en', labels }) {
  const ar = lang === 'ar';
  const date = new Date(dateIso || Date.now()).toLocaleDateString(ar ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(labels.title)}</title>`
    + `<style>@page{size:landscape;margin:0}body{margin:0;font-family:Georgia,serif;color:#16211D;background:#FDFBF6}`
    + `.c{box-sizing:border-box;width:100vw;min-height:100vh;padding:56px;display:flex;align-items:center;justify-content:center}`
    + `.f{border:2px solid #C1922F;outline:1px solid #123F35;outline-offset:6px;width:100%;max-width:900px;padding:56px 40px;text-align:center}</style></head>`
    + `<body><div class="c"><div class="f">`
    + `<div style="letter-spacing:.2em;text-transform:uppercase;font-size:13px;color:#A9532A">Abir Diab</div>`
    + `<h1 style="font-weight:normal;font-size:40px;margin:18px 0 28px">${esc(labels.title)}</h1>`
    + `<div style="color:#5b6b64;font-size:16px">${esc(labels.certify)}</div>`
    + `<div style="font-size:34px;margin:14px 0;color:#123F35">${esc(name)}</div>`
    + `<div style="color:#5b6b64;font-size:16px">${esc(labels.completed)}</div>`
    + `<div style="font-size:26px;margin:14px 0 26px;font-style:italic">${esc(course)}</div>`
    + `<div style="color:#5b6b64;font-size:14px">${esc(labels.on)} ${esc(date)}</div>`
    + `<div style="margin-top:34px;font-size:15px">${esc(labels.signed)}</div></div></div></body></html>`;
}
