import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { JoinButton } from './ui.jsx';

describe('admin Join button', () => {
  it('opens a safe meeting link in a new tab', () => {
    const h = renderToString(<JoinButton url="https://meet.jit.si/AbirDiab-abc" />);
    expect(h).toContain('href="https://meet.jit.si/AbirDiab-abc"');
    expect(h).toContain('target="_blank"');
    expect(h).toContain('noopener');
    expect(h).toContain('Join');
  });
  it('shows nothing when there is no link or the link is not https', () => {
    expect(renderToString(<JoinButton url="" />)).toBe('');
    expect(renderToString(<JoinButton url={null} />)).toBe('');
    expect(renderToString(<JoinButton url="javascript:alert(1)" />)).toBe('');
    expect(renderToString(<JoinButton url="http://example.com" />)).toBe('');
  });
  it('is greyed out before the window opens and after it closes', () => {
    const soon = new Date(Date.now() + 3 * 3600e3).toISOString();
    const old = new Date(Date.now() - 8 * 3600e3).toISOString();
    const now = new Date(Date.now() + 10 * 60e3).toISOString();
    const url = 'https://meet.jit.si/AbirDiab-abc';
    const early = renderToString(<JoinButton url={url} start={soon} />);
    expect(early).toContain('disabled');
    expect(early).not.toContain('href=');
    const late = renderToString(<JoinButton url={url} start={old} />);
    expect(late).toContain('disabled');
    expect(late).toContain('Closed');
    expect(renderToString(<JoinButton url={url} start={now} />)).toContain('href="https://meet.jit.si/AbirDiab-abc"');
  });
});
