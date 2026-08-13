/**
 * Self-check for the multi-key-chart axis grouping — run with:
 * npx tsx src/lib/format/group-keys-by-unit.check.ts
 */
import assert from 'node:assert';
import { groupKeysByUnit } from './group-keys-by-unit';

// 1 unit: both keys share one axis.
{
  const r = groupKeysByUnit(['temp1', 'temp2'], { temp1: '°C', temp2: '°C' });
  assert.strictEqual(r.axes.length, 1);
  assert.deepStrictEqual(r.axes[0].keys, ['temp1', 'temp2']);
  assert.strictEqual(r.omittedKeys.length, 0);
}

// 2 units: two axes, none omitted.
{
  const r = groupKeysByUnit(['temp', 'pressure'], { temp: '°C', pressure: 'bar' });
  assert.strictEqual(r.axes.length, 2);
  assert.strictEqual(r.axes[0].unitSymbol, '°C');
  assert.strictEqual(r.axes[1].unitSymbol, 'bar');
  assert.strictEqual(r.omittedKeys.length, 0);
}

// 3 units: first 2 axes kept, 3rd group's keys reported as omitted.
{
  const r = groupKeysByUnit(['temp', 'pressure', 'signal'], { temp: '°C', pressure: 'bar', signal: 'dBm' });
  assert.strictEqual(r.axes.length, 2);
  assert.deepStrictEqual(r.omittedKeys, ['signal']);
}

// All unitless: one shared axis, undefined symbol.
{
  const r = groupKeysByUnit(['a', 'b'], undefined);
  assert.strictEqual(r.axes.length, 1);
  assert.strictEqual(r.axes[0].unitSymbol, undefined);
  assert.deepStrictEqual(r.axes[0].keys, ['a', 'b']);
}

// Mixed unit/unitless: unitless keys form their own group.
{
  const r = groupKeysByUnit(['temp', 'raw'], { temp: '°C' });
  assert.strictEqual(r.axes.length, 2);
  assert.strictEqual(r.axes[0].unitSymbol, '°C');
  assert.strictEqual(r.axes[1].unitSymbol, undefined);
  assert.deepStrictEqual(r.axes[1].keys, ['raw']);
}

console.log('group-keys-by-unit.ts checks passed');
