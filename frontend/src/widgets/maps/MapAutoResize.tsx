'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Leaflet caches its container's pixel size at init and only recomputes it on a window
 * `resize`. Inside a react-grid-layout cell the container changes size without the window
 * ever resizing — dragging, resizing the widget, or the grid reflowing after another widget
 * moves. The map then renders against stale dimensions: grey strips where tiles were never
 * requested, and clicks landing at the wrong lat/lng.
 *
 * A ResizeObserver on the actual container is the fix; `invalidateSize` is cheap and
 * idempotent, so calling it on every observed change is fine. Drop this inside any
 * <MapContainer> that isn't a fixed-size element.
 */
export function MapAutoResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    // Fires once on observe, which also covers maps mounted into a container that was
    // still 0x0 (e.g. behind a just-opened dialog) at MapContainer init time.
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}
