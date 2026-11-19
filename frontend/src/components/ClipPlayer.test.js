import { describe, it, expect } from 'vitest';
import { clipState, clock } from './ClipPlayer.jsx';

describe('clipState (only the chosen part of the video exists)', () => {
  it('measures progress across the clip, not the whole video', () => {
    expect(clipState(5, 5, 60)).toMatchObject({ phase: 'playing', progress: 0 });
    expect(clipState(32.5, 5, 60).progress).toBeCloseTo(0.5, 5);
    expect(clipState(32.5, 5, 60).seconds).toBeCloseTo(27.5, 5);
  });
  it('says ended at the end time', () => {
    expect(clipState(60, 5, 60).phase).toBe('ended');
    expect(clipState(59.8, 5, 60).phase).toBe('ended');
    expect(clipState(200, 5, 60).phase).toBe('ended');
  });
  it('says before when the picture is earlier than the start', () => {
    expect(clipState(0, 5, 60).phase).toBe('before');
    expect(clipState(4.6, 5, 60).phase).toBe('playing');
  });
  it('formats times', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(80)).toBe('1:20');
    expect(clock(55)).toBe('0:55');
  });
});
