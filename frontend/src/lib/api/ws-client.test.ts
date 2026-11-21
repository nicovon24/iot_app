import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSessionToken } from '../session';
import { createWsClient } from './ws-client';

class SocketStub {
  static current: SocketStub | null = null;
  private closeHandler?: (event: CloseEvent) => void;

  constructor() {
    SocketStub.current = this;
  }

  addEventListener(type: string, handler: EventListener) {
    if (type === 'close') this.closeHandler = handler as (event: CloseEvent) => void;
  }

  emitClose(code: number) {
    this.closeHandler?.({ code } as CloseEvent);
  }
}

describe('WebSocket session handling', () => {
  afterEach(() => {
    setSessionToken(null);
    vi.unstubAllGlobals();
  });

  it('ignores a session-ended close from a previous login', () => {
    vi.stubGlobal('WebSocket', SocketStub);
    setSessionToken('old-session');
    const client = createWsClient('telemetry');
    const onClosed = vi.fn();
    client.onClosed(onClosed);
    setSessionToken('new-session');
    expect(SocketStub.current).not.toBeNull();
    SocketStub.current?.emitClose(1008);
    expect(onClosed).not.toHaveBeenCalled();
  });
});
