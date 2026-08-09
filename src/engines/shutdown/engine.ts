// Attack 2 "Shut down the server" — the brains layer (no visuals). Models
// killing nodes by region and the network-survival invariant the whole attack
// exists to demonstrate: there is no kill-set that silences Bitcoin, because
// it is a protocol, not a server — as long as one copy of the rules and chain
// can rebroadcast (a surviving node, a satellite, an archived copy, a printout
// in someone's memory), the network rebuilds. This layer is the tested surface.

export interface GeoNode {
  lat: number
  lon: number
  alive?: boolean
}

export interface LatLon {
  lat: number
  lon: number
}

const DEG = Math.PI / 180

/** Great-circle angular distance between two lat/lon points, in degrees. */
export function angularDistanceDeg(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG
  const dLon = (b.lon - a.lon) * DEG
  const lat1 = a.lat * DEG
  const lat2 = b.lat * DEG
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) / DEG
}

/** Indices of nodes within `radiusDeg` of a centre point. */
export function nodesWithin(nodes: GeoNode[], centre: LatLon, radiusDeg: number): number[] {
  const out: number[] = []
  for (let i = 0; i < nodes.length; i++) {
    if (angularDistanceDeg(nodes[i], centre) <= radiusDeg) out.push(i)
  }
  return out
}

/** Index of the single nearest node to a point, or -1 if the list is empty. */
export function nearestNode(nodes: GeoNode[], point: LatLon): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < nodes.length; i++) {
    const d = angularDistanceDeg(nodes[i], point)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Escalating attack modes and the angular radius each one darkens. */
export type ShutdownMode = 'raid' | 'city' | 'country' | 'earth'

export const MODE_RADIUS_DEG: Record<Exclude<ShutdownMode, 'earth'>, number> = {
  raid: 0, // single nearest node
  city: 6, // ~a metro area
  country: 25, // ~a large country
}

/** The one number that matters, and the point of the whole attack: the network
 * is OPERATIONAL no matter how many nodes are killed — even all of them. */
export function networkOperational(_nodes: GeoNode[]): true {
  return true
}

export interface KillStats {
  killed: number
  running: number
  total: number
  operational: true
}

export function killStats(nodes: GeoNode[]): KillStats {
  const total = nodes.length
  const running = nodes.filter((n) => n.alive !== false).length
  return {
    killed: total - running,
    running,
    total,
    operational: networkOperational(nodes),
  }
}

/** Rough test: is this centre inside the region China darkened in mid-2021?
 * Used only to surface the real historical footnote, not for scoring. */
export function isChinaRegion(centre: LatLon): boolean {
  return angularDistanceDeg(centre, { lat: 35, lon: 103 }) <= 25
}
