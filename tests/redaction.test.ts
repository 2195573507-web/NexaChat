import { describe, expect, it } from 'vitest';
import { redactSensitive } from '../src/main/security/redaction';

describe('security redaction', () => {
  it('redacts raw Gateway nxk keys and bearer-wrapped Gateway keys', () => {
    const rawGatewayKey = 'nxk_1234567890abcdef1234567890abcdef';
    const content = redactSensitive({
      rawGatewayKey,
      bearer: `Bearer ${rawGatewayKey}`,
      providerKey: 'sk-redaction-secret',
    });

    expect(content).not.toContain(rawGatewayKey);
    expect(content).not.toContain(`Bearer ${rawGatewayKey}`);
    expect(content).not.toContain('sk-redaction-secret');
    expect(content).toContain('[REDACTED]');
  });

  it('redacts embedding request headers and bodies that include provider secrets', () => {
    const raw = {
      endpoint: '/v1/embeddings',
      headers: { authorization: 'Bearer sk-embedding-redaction-secret' },
      body: { apiKey: 'sk-embedding-redaction-secret', input: ['private retrieval query'] },
    };
    const content = redactSensitive(raw);

    expect(content).not.toContain('sk-embedding-redaction-secret');
    expect(content).not.toContain('Bearer sk-embedding-redaction-secret');
    expect(content).toContain('/v1/embeddings');
    expect(content).toContain('[REDACTED]');
  });
});
