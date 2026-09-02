/** Multi-key-chart axis grouping. */
import { describe, expect, it } from 'vitest';
import { groupKeysByUnit } from './group-keys-by-unit';

describe('groupKeysByUnit', () => {
  it('groups keys sharing one unit onto a single axis', () => {
    const r = groupKeysByUnit(['temp1', 'temp2'], { temp1: '°C', temp2: '°C' });
    expect(r.axes.length).toBe(1);
    expect(r.axes[0].keys).toEqual(['temp1', 'temp2']);
    expect(r.omittedKeys.length).toBe(0);
  });

  it('gives two units two axes, nothing omitted', () => {
    const r = groupKeysByUnit(['temp', 'pressure'], { temp: '°C', pressure: 'bar' });
    expect(r.axes.length).toBe(2);
    expect(r.axes[0].unitSymbol).toBe('°C');
    expect(r.axes[1].unitSymbol).toBe('bar');
    expect(r.omittedKeys.length).toBe(0);
  });

  it('keeps the first two axes and omits the third unit group', () => {
    const r = groupKeysByUnit(['temp', 'pressure', 'signal'], {
      temp: '°C',
      pressure: 'bar',
      signal: 'dBm',
    });
    expect(r.axes.length).toBe(2);
    expect(r.omittedKeys).toEqual(['signal']);
  });

  it('puts all-unitless keys on one shared axis with an undefined symbol', () => {
    const r = groupKeysByUnit(['a', 'b'], undefined);
    expect(r.axes.length).toBe(1);
    expect(r.axes[0].unitSymbol).toBeUndefined();
    expect(r.axes[0].keys).toEqual(['a', 'b']);
  });

  it('splits unit and unitless keys into separate groups', () => {
    const r = groupKeysByUnit(['temp', 'raw'], { temp: '°C' });
    expect(r.axes.length).toBe(2);
    expect(r.axes[0].unitSymbol).toBe('°C');
    expect(r.axes[1].unitSymbol).toBeUndefined();
    expect(r.axes[1].keys).toEqual(['raw']);
  });
});
