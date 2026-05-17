const secretPatterns = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /sk-[A-Za-z0-9._-]+/gi,
  /nxk_[A-Za-z0-9._-]+/gi,
  /(api[-_ ]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi,
  /(authorization["']?\s*[:=]\s*["']?)[^"',\n]+/gi,
  /(x-api-key["']?\s*[:=]\s*["']?)[^"',\n]+/gi,
];

export function redactSensitive(value: unknown): string {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, (match, prefix) => {
      if (typeof prefix === 'string' && prefix.length > 0) {
        return `${prefix}[REDACTED]`;
      }
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED]';
    });
  }
  return text;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (/authorization|api-key|token|secret|key/i.test(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactSensitive(value);
    }
  }
  return redacted;
}
