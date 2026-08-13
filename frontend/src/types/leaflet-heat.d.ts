/**
 * Minimal typings for leaflet.heat, which ships none of its own.
 *
 * The `import 'leaflet'` below is load-bearing: without an import or export, TypeScript reads
 * this file as a global script and `declare module 'leaflet'` *replaces* @types/leaflet instead
 * of augmenting it — which silently unbuilds every other map component. With the import, the
 * file is a module and the declaration merges as intended.
 *
 * Only the surface this app uses is declared — the plugin's option set is larger, but typing
 * calls we never make would be guessing at an API we don't exercise.
 */
import 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    /** Point radius in pixels. */
    radius?: number;
    /** How far each point's influence bleeds past its radius. */
    blur?: number;
    /** Zoom level at which points reach maximum intensity. */
    maxZoom?: number;
    /** Intensity that maps to the top of the gradient. */
    max?: number;
    /** Stop position (0-1) to color. */
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number, number?]>): this;
    setOptions(options: HeatLayerOptions): this;
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions,
  ): HeatLayer;
}

/** Imported for its side effect: the module attaches heatLayer to Leaflet on load. */
declare module 'leaflet.heat';
