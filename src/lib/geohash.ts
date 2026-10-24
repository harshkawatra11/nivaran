// Standard base32 geohash encode. Used at precision 6 (~0.6 x 1.2 km cells) to group
// nearby civic complaints into clusters without a PostGIS dependency.
const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function geohash(lat: number, lng: number, precision = 6): string {
  let idx = 0,
    bit = 0,
    even = true,
    out = "";
  let latMin = -90,
    latMax = 90,
    lngMin = -180,
    lngMax = 180;

  while (out.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      out += B32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return out;
}
