import { getDistance } from 'geolib';
import { TrailPoint } from '../types';

export function haversineDistanceMeters(points: TrailPoint[]): number {
  if (points.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += getDistance(points[i - 1], points[i]);
  }
  return total;
}

export function formatDistance(distanceM: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const miles = distanceM / 1609.34;
    return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
  }
  const km = distanceM / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}
