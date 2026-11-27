import { getSessionToken, setSessionToken } from '@/lib/session';

const MODE_KEY = 'iot_demo_mode';
const DATA_KEY = 'iot_demo_data_v2';
const DEMO_TOKEN = 'iotarg-demo-session';

export function isDemoSession(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem(MODE_KEY) === '1' &&
    getSessionToken() === DEMO_TOKEN
  );
}

export function startDemoSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('iot_demo_data_v1');
  window.sessionStorage.removeItem(DATA_KEY);
  window.sessionStorage.setItem(MODE_KEY, '1');
  setSessionToken(DEMO_TOKEN);
}

export function stopDemoSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('iot_demo_data_v1');
  window.sessionStorage.removeItem(MODE_KEY);
  window.sessionStorage.removeItem(DATA_KEY);
  if (getSessionToken() === DEMO_TOKEN) setSessionToken(null);
}

export const DEMO_DATA_KEY = DATA_KEY;
