/**
 * Seeds a device with a simulated position trail, so the Movement Heatmap widget has something
 * to draw.
 *
 * Exists because nothing in this project produces telemetry — the app is a read-only view over a
 * ThingsBoard tenant, so a widget that plots position *history* can't be exercised without
 * either a real moving device or seeded data. This is the seeded-data path.
 *
 * The walk is shaped for a heatmap rather than a route: it dwells around a few stops and moves
 * briskly between them, which is what makes overlapping points build heat. A constant-speed
 * line would render as a uniform smear and tell you nothing.
 *
 * Usage, from backend/:
 *   npx tsx scripts/seed-movement.ts <device-name> [--days 7] [--interval 300]
 *
 * Reads THINGSBOARD_URL / _USERNAME / _PASSWORD from backend/.env, the same credentials the
 * server uses. Writes only telemetry, and only to the named device.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Stop {
  latitude: number;
  longitude: number;
  /** Rough share of the total time spent here. Weights need not sum to anything. */
  dwell: number;
  label: string;
}

/** A depot, two work sites and a yard around Berlin — the city the existing fleet data uses. */
export const STOPS: Stop[] = [
  { latitude: 52.5200, longitude: 13.4050, dwell: 3, label: 'Mitte depot' },
  { latitude: 52.4862, longitude: 13.4283, dwell: 2, label: 'Neukölln site' },
  { latitude: 52.5429, longitude: 13.3512, dwell: 2, label: 'Wedding site' },
  { latitude: 52.5065, longitude: 13.2846, dwell: 1, label: 'Charlottenburg yard' },
];

/** Metres of GPS scatter while parked, so a stop reads as a dense blob rather than one pixel. */
const DWELL_JITTER_M = 60;
const TRAVEL_JITTER_M = 25;
const METRES_PER_DEG_LAT = 111_320;
/** Share of each stop's slot spent driving to the next one — roughly a working vehicle's day. */
const TRAVEL_SHARE = 0.25;
/** Full circuits of the stop list across the seeded window. */
const CIRCUITS = 3;

function loadEnv(): Record<string, string> {
  const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function parseArgs() {
  const [, , deviceName, ...rest] = process.argv;
  if (!deviceName || deviceName.startsWith('--')) {
    console.error('Usage: npx tsx scripts/seed-movement.ts <device-name> [--days 7] [--interval 300]');
    process.exit(1);
  }
  const flag = (name: string, fallback: number) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 && rest[i + 1] ? Number(rest[i + 1]) : fallback;
  };
  return { deviceName, days: flag('days', 7), intervalSec: flag('interval', 300) };
}

async function login(url: string, username: string, password: string): Promise<string> {
  const response = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`ThingsBoard login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

async function findDevice(url: string, token: string, name: string) {
  const response = await fetch(
    `${url}/api/tenant/devices?pageSize=200&page=0&textSearch=${encodeURIComponent(name)}`,
    { headers: { 'X-Authorization': `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Device lookup failed: ${response.status}`);
  const body = (await response.json()) as { data: Array<{ id: { id: string }; name: string }> };
  const exact = body.data.find((d) => d.name === name) ?? body.data[0];
  if (!exact) throw new Error(`No device found matching "${name}"`);
  return exact;
}

/**
 * Scatters a position by up to `metres` in each direction.
 *
 * Latitude and longitude need different divisors: a degree of longitude shrinks as you move away
 * from the equator, so sharing one would stretch the scatter east-west.
 */
function jitter(latitude: number, longitude: number, metres: number) {
  const deltaLatitude = (Math.random() - 0.5) * 2 * (metres / METRES_PER_DEG_LAT);
  const deltaLongitude =
    (Math.random() - 0.5) * 2 * (metres / (METRES_PER_DEG_LAT * Math.cos((latitude * Math.PI) / 180)));
  return { latitude: latitude + deltaLatitude, longitude: longitude + deltaLongitude };
}

/**
 * Builds the trail: cycle through the stops, dwelling at each for a share of the window and
 * travelling in a straight line between them.
 */
export function buildTrail(startTs: number, endTs: number, intervalMs: number) {
  const points: Array<{ ts: number; latitude: number; longitude: number }> = [];
  const totalDwell = STOPS.reduce((sum, stop) => sum + stop.dwell, 0);
  const cycleMs = (endTs - startTs) / CIRCUITS;

  for (let ts = startTs; ts <= endTs; ts += intervalMs) {
    const phase = ((ts - startTs) % cycleMs) / cycleMs;
    // Where in the stop sequence this moment falls, in dwell-weight units.
    const scaled = phase * totalDwell;
    let acc = 0;
    let index = 0;
    for (let i = 0; i < STOPS.length; i += 1) {
      if (scaled < acc + STOPS[i].dwell) {
        index = i;
        break;
      }
      acc += STOPS[i].dwell;
      index = i;
    }
    const stop = STOPS[index];
    const within = (scaled - acc) / stop.dwell; // 0-1 progress through this stop's slot

    if (within > 1 - TRAVEL_SHARE) {
      // On the road to the next stop: interpolate, with light jitter so the line isn't perfect.
      const next = STOPS[(index + 1) % STOPS.length];
      const progress = (within - (1 - TRAVEL_SHARE)) / TRAVEL_SHARE;
      points.push({
        ts,
        ...jitter(
          stop.latitude + (next.latitude - stop.latitude) * progress,
          stop.longitude + (next.longitude - stop.longitude) * progress,
          TRAVEL_JITTER_M,
        ),
      });
    } else {
      points.push({ ts, ...jitter(stop.latitude, stop.longitude, DWELL_JITTER_M) });
    }
  }
  return points;
}

async function main() {
  const env = loadEnv();
  const url = env.THINGSBOARD_URL;
  if (!url || !env.THINGSBOARD_USERNAME || !env.THINGSBOARD_PASSWORD) {
    throw new Error('THINGSBOARD_URL / _USERNAME / _PASSWORD must be set in backend/.env');
  }

  const { deviceName, days, intervalSec } = parseArgs();
  const token = await login(url, env.THINGSBOARD_USERNAME, env.THINGSBOARD_PASSWORD);
  const device = await findDevice(url, token, deviceName);

  const endTs = Date.now();
  const startTs = endTs - days * 86_400_000;
  const trail = buildTrail(startTs, endTs, intervalSec * 1000);

  console.log(`Device : ${device.name} (${device.id.id})`);
  console.log(`Window : ${new Date(startTs).toLocaleString()} → ${new Date(endTs).toLocaleString()}`);
  console.log(`Points : ${trail.length} (every ${intervalSec}s over ${days} days)`);

  // Posted timestamped and in batches — one request per point would be thousands of round trips,
  // and TB accepts an array of {ts, values} directly.
  const payload = trail.map((point) => ({
    ts: point.ts,
    values: { latitude: point.latitude, longitude: point.longitude },
  }));
  const BATCH = 500;
  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH);
    const response = await fetch(
      `${url}/api/plugins/telemetry/DEVICE/${device.id.id}/timeseries/ANY?scope=ANY`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
        body: JSON.stringify(batch),
      },
    );
    if (!response.ok) {
      throw new Error(`Telemetry POST failed at batch ${i / BATCH}: ${response.status} ${await response.text()}`);
    }
    console.log(`  sent ${Math.min(i + BATCH, payload.length)}/${payload.length}`);
  }

  console.log('\nDone. Set the dashboard time range to cover the window above and the heatmap will render.');
}

// Guarded so the check script can import buildTrail without the seed firing at a real tenant.
if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
