/**
 * Vector style of the base map. Any MapLibre style URL works (OpenFreeMap, MapTiler with a
 * key, or a self-hosted style); set `VITE_MAP_STYLE_URL` to switch without a code change.
 */
export const MAP_STYLE_URL: string =
  import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

/** Jakarta, used when nothing else says where to look. */
export const DEFAULT_MAP_CENTER = { lat: -6.2, lng: 106.82 }

export const DEFAULT_MAP_ZOOM = 11
