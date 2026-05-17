export interface ProgressiveRevealFrame {
  visibleContent: string;
  delayMs: number;
}

export interface ProgressiveRevealOptions {
  reducedMotion?: boolean;
}

const SENTENCE_PATTERN = /[^.!?\u3002\uff01\uff1f]+[.!?\u3002\uff01\uff1f]?\s*/g;

export function splitProgressiveSegments(value: string): string[] {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }
  const paragraphs = normalized.split(/\n{2,}/).map((segment) => segment.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.map((segment, index) => (index === 0 ? segment : `\n\n${segment}`));
  }
  const sentences = normalized.match(SENTENCE_PATTERN)?.map((segment) => segment.trim()).filter(Boolean) ?? [];
  return sentences.length > 0 ? sentences : [normalized];
}

export function buildProgressiveRevealFrames(value: string, options: ProgressiveRevealOptions = {}): ProgressiveRevealFrame[] {
  const segments = splitProgressiveSegments(value);
  let visibleContent = '';
  return segments.map((segment) => {
    visibleContent += segment;
    return {
      visibleContent,
      delayMs: getProgressiveDelayMs(segment, options),
    };
  });
}

export function getProgressiveDelayMs(segment: string, options: ProgressiveRevealOptions = {}): number {
  if (options.reducedMotion) {
    return 0;
  }
  const length = segment.trim().length;
  return Math.min(140, Math.max(28, length * 3));
}
