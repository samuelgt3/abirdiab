import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import DayCalendar from './DayCalendar.jsx';

const days = ['2026-11-17', '2026-11-18', '2026-12-02'];
const render = (props = {}) => renderToString(<DayCalendar days={days} value="" lang="en" prevLabel="Previous month" nextLabel="Next month" onPick={() => {}} {...props} />);

describe('day calendar', () => {
  it('starts on the first month with a free day and shows its name', () => {
    expect(render()).toContain('November 2026');
  });
  it('lets only the posted days be pressed', () => {
    const html = render();
    const buttons = html.match(/<button[^>]*aria-pressed[^>]*>/g) || [];
    expect(buttons).toHaveLength(30); // every day of November is drawn
    expect(buttons.filter((b) => !/disabled/.test(b))).toHaveLength(2); // but only the 17th and 18th can be pressed
  });
  it('cannot go back before the first month, but can go forward to the next one with a free day', () => {
    const html = render();
    const prev = html.match(/<button[^>]*aria-label="Previous month"[^>]*>/)[0];
    const next = html.match(/<button[^>]*aria-label="Next month"[^>]*>/)[0];
    expect(prev).toMatch(/ disabled=""/);
    expect(next).not.toMatch(/ disabled=""/);
  });
  it('marks the picked day and days that have a chosen time', () => {
    const html = render({ value: '2026-11-17', marked: ['2026-11-18'] });
    expect(html).toContain('bg-green font-semibold text-cream');
    expect(html).toContain('bg-green/15');
  });
});
