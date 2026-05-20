import { describe, expect, it } from 'vitest';
import { redactKnownSecrets, redactSensitive } from '../src/main/security/redaction';

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

  it('redacts known provider secret values that do not match token-shaped patterns', () => {
    const secret = 'plain-provider-secret';
    const content = redactKnownSecrets({
      error: `provider rejected ${secret}`,
      encoded: `provider rejected ${encodeURIComponent(secret)}`,
    }, [secret]);

    expect(content).not.toContain(secret);
    expect(content).not.toContain(encodeURIComponent(secret));
    expect(content).toContain('[REDACTED]');
  });
});
