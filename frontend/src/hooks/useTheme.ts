'use client';

import { useCallback, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'iot_theme';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    setIsDark(next);
  }, []);

  return { isDark, toggle };
}
