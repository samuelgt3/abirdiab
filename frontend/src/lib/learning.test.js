import { describe, it, expect } from 'vitest';
import { COURSE_KEY, certificateHtml, countByStatus, courseProgress, indexProgress, lessonKey, lessonsOf, pickContinue } from './learning.js';

const course = { id: 'c1', title: 'Foundations', pack_items: [{ title: 'Intro', kind: 'v' }, { title: 'Breathing ', kind: 'a' }, { title: 'Guide', kind: 'p' }] };
const single = { id: 'c2', title: 'One PDF', pack_items: [] };
const other = { id: 'c3', title: 'Third', pack_items: [{ title: 'Only' }] };

const rows = (done = [], opened = []) => indexProgress({
  done: done.map(([course_id, key, at]) => ({ course_id, key, at: at || '2026-11-10T10:00:00Z' })),
  opened: opened.map(([course_id, at]) => ({ course_id, at })),
});

describe('lessons', () => {
  it('keys by lower-cased trimmed title, so order does not matter', () => {
    expect(lessonKey({ title: ' Breathing ' })).toBe('breathing');
    expect(lessonsOf(course).map((l) => l.key)).toEqual(['intro', 'breathing', 'guide']);
    expect(lessonsOf({ pack_items: null })).toEqual([]);
  });
});

describe('courseProgress', () => {
  it('starts at zero and names the first lesson as next', () => {
    const p = courseProgress(course, rows());
    expect(p).toMatchObject({ total: 3, done: 0, pct: 0, status: 'notStarted', completedAt: null });
    expect(p.next.key).toBe('intro');
  });
  it('counts ticked lessons and moves the next one along', () => {
    const p = courseProgress(course, rows([['c1', 'intro'], ['c1', 'guide']]));
    expect(p).toMatchObject({ done: 2, pct: 67, status: 'inProgress' });
    expect(p.next.key).toBe('breathing');
  });
  it('is completed when every lesson is ticked, dated by the last one', () => {
    const p = courseProgress(course, rows([['c1', 'intro', '2026-11-01T00:00:00Z'], ['c1', 'breathing', '2026-11-03T00:00:00Z'], ['c1', 'guide', '2026-11-02T00:00:00Z']]));
    expect(p).toMatchObject({ pct: 100, status: 'completed', next: null, completedAt: '2026-11-03T00:00:00Z' });
  });
  it('ignores ticks that belong to other courses', () => {
    expect(courseProgress(course, rows([['c9', 'intro']])).done).toBe(0);
  });
  it('tracks a course without lessons as one item', () => {
    expect(courseProgress(single, rows())).toMatchObject({ total: 1, status: 'notStarted', single: true });
    expect(courseProgress(single, rows([['c2', COURSE_KEY]]))).toMatchObject({ pct: 100, status: 'completed' });
  });
});

describe('pickContinue', () => {
  const lib = [course, single, other];
  it('offers the most recently opened unfinished course', () => {
    const idx = rows([], [['c1', '2026-11-05T00:00:00Z'], ['c3', '2026-11-09T00:00:00Z']]);
    expect(pickContinue(lib, idx).c.id).toBe('c3');
    expect(pickContinue(lib, idx).pr.status).toBe('notStarted'); // carries its progress with it
  });
  it('skips finished courses', () => {
    const idx = rows([['c3', 'only']], [['c3', '2026-11-09T00:00:00Z'], ['c1', '2026-11-05T00:00:00Z']]);
    expect(pickContinue(lib, idx).c.id).toBe('c1');
  });
  it('falls back to one in progress, then to the first not started, then to nothing', () => {
    expect(pickContinue(lib, rows([['c1', 'intro']])).c.id).toBe('c1');
    expect(pickContinue(lib, rows()).c.id).toBe('c1');
    expect(pickContinue([other], rows([['c3', 'only']]))).toBeNull();
    expect(pickContinue([], rows())).toBeNull();
  });
});

describe('countByStatus', () => {
  it('counts each state for the filter buttons', () => {
    const idx = rows([['c1', 'intro'], ['c3', 'only']]);
    expect(countByStatus([course, single, other], idx)).toEqual({ all: 3, inProgress: 1, notStarted: 1, completed: 1 });
  });
});

describe('certificateHtml', () => {
  const labels = { title: 'Certificate', certify: 'This certifies that', completed: 'completed', on: 'on', signed: 'Abir Diab' };
  it('contains the name, course and date, escaped', () => {
    const html = certificateHtml({ name: 'A <b>B</b>', course: 'Reiki & more', dateIso: '2026-11-03T00:00:00Z', labels });
    expect(html).toContain('Reiki &amp; more');
    expect(html).not.toContain('<b>B</b>');
    expect(html).toContain('2026');
  });
  it('is right-to-left in Arabic', () => {
    expect(certificateHtml({ name: 'x', course: 'y', lang: 'ar', labels })).toContain('dir="rtl"');
  });
});
