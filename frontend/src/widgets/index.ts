export * from './admin';
export * from './charts';
export * from './entity';
export * from './forms';
// 'maps' is deliberately excluded: leaflet touches `window` at module scope, so any static
// import of this barrel (even for an unrelated widget) would crash SSR. Import map widgets
// directly from '@/widgets/maps' via next/dynamic({ ssr: false }) instead.
