'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken, initSessionFromStorage } from '@/lib';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Reads localStorage, which isn't available during render (SSR + hydration) — this
    // one-time sync-on-mount is the legitimate exception to react-hooks/set-state-in-effect.
    initSessionFromStorage();
    if (getSessionToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthenticated(true);
    } else {
      router.push('/login');
    }
    setChecked(true);
  }, [router]);

  if (!checked || !authenticated) return null;

  return <>{children}</>;
}
