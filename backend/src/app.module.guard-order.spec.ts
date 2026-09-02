import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for the bug documented in app.module.ts's own comment and STATE.md
 * (Phase 2.2): registering the three APP_GUARD providers out of order — or split across
 * different modules, where Nest doesn't guarantee execution order — silently disabled all
 * per-entity hierarchy scoping, because CustomerScopeGuard/ReaderBlockGuard read
 * request.session before SessionAuthGuard had a chance to attach it. Nest guarantees
 * same-module APP_GUARD providers run in declaration order, so this test pins that order
 * at the source level rather than spinning up the full app (which would require every real
 * module's dependencies — Prisma, Redis, ThingsBoard config).
 */
describe('AppModule guard registration order', () => {
  const source = readFileSync(join(__dirname, 'app.module.ts'), 'utf-8');

  function providerLineIndex(guardClass: string): number {
    const match = source.match(new RegExp(`useClass:\\s*${guardClass}`));
    if (!match || match.index === undefined) {
      throw new Error(`${guardClass} not found as an APP_GUARD provider in app.module.ts`);
    }
    return match.index;
  }

  it('registers SessionAuthGuard before CustomerScopeGuard and ReaderBlockGuard', () => {
    const sessionIndex = providerLineIndex('SessionAuthGuard');
    const customerScopeIndex = providerLineIndex('CustomerScopeGuard');
    const readerBlockIndex = providerLineIndex('ReaderBlockGuard');

    expect(sessionIndex).toBeLessThan(customerScopeIndex);
    expect(sessionIndex).toBeLessThan(readerBlockIndex);
  });

  it('keeps all three guards in the same providers array (not split across modules)', () => {
    const providersBlock = source.slice(source.indexOf('providers:'));
    expect(providersBlock).toMatch(/useClass:\s*SessionAuthGuard/);
    expect(providersBlock).toMatch(/useClass:\s*CustomerScopeGuard/);
    expect(providersBlock).toMatch(/useClass:\s*ReaderBlockGuard/);
  });
});
