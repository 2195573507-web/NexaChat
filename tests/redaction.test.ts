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
});
