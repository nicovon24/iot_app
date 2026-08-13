'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken, initSessionFromStorage } from '@\/lib';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    initSessionFromStorage();
    if (getSessionToken()) {
      setAuthenticated(true);
    } else {
      router.push('/login');
    }
    setChecked(true);
  }, [router]);

  if (!checked || !authenticated) return null;

  return <>{children}</>;
}
