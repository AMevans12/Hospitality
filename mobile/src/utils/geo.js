// Straight-line distance in metres between two GPS points (display only; the server re-checks).
export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dp = rad(lat2 - lat1);
  const dl = rad(lng2 - lng1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}