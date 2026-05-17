import { describe, expect, it } from 'vitest';
import { buildProgressiveRevealFrames, getProgressiveDelayMs, splitProgressiveSegments } from '../src/renderer/modules/progressiveReveal';

describe('renderer-side progressive reveal', () => {
  it('segments assistant content and builds cumulative frames without claiming backend streaming', () => {
    const segments = splitProgressiveSegments('First sentence. Second sentence.\n\nThird paragraph.');
    const frames = buildProgressiveRevealFrames('First sentence. Second sentence.\n\nThird paragraph.');

    expect(segments).toEqual(['First sentence. Second sentence.', '\n\nThird paragraph.']);
    expect(frames.map((frame) => frame.visibleContent)).toEqual([
      'First sentence. Second sentence.',
      'First sentence. Second sentence.\n\nThird paragraph.',
    ]);
    expect(frames.every((frame) => frame.delayMs >= 28 && frame.delayMs <= 140)).toBe(true);
  });

  it('keeps reveal timing bounded for short and long segments', () => {
    expect(getProgressiveDelayMs('x')).toBe(28);
    expect(getProgressiveDelayMs('x'.repeat(200))).toBe(140);
  });
});
