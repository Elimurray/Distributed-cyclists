export const REGIONS = {
  hamilton: {
    name: 'Hamilton',
    bounds: {
      north: -37.7200,
      south: -37.8200,
      east: 175.3200,
      west: 175.2200,
    },
    center: { lat: -37.7870, lng: 175.2793 },
    defaultZoom: 13,
  },
  tauranga: {
    name: 'Tauranga',
    bounds: {
      north: -37.6300,
      south: -37.7300,
      east: 176.2200,
      west: 176.1000,
    },
    center: { lat: -37.6878, lng: 176.1651 },
    defaultZoom: 13,
  },
} as const

export type RegionKey = keyof typeof REGIONS
