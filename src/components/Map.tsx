'use client';

import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Entry, Trail } from '../types';
import { formatDistance } from '../lib/geo';

const icon = L.divIcon({
  html: '<div style="width:20px;height:20px;background:#386641;border:3px solid white;border-radius:9999px;box-shadow:0 4px 10px rgba(0,0,0,0.25);"></div>',
  iconSize: [26, 26],
  className: ''
});

interface MapProps {
  entries: Entry[];
  trails: Trail[];
  activeTrail?: Trail | null;
  unit: 'metric' | 'imperial';
}

const defaultPosition: [number, number] = [35.681236, 139.767125];

export function MapView({ entries, trails, activeTrail, unit }: MapProps) {
  const firstEntryWithLoc = entries.find((e) => e.loc);
  const firstTrailWithPoints = trails.find((t) => t.points.length > 0);
  const hasLocation = Boolean(firstEntryWithLoc || firstTrailWithPoints || activeTrail?.points.length);

  const center: [number, number] = hasLocation
    ? firstEntryWithLoc?.loc
      ? [firstEntryWithLoc.loc.lat, firstEntryWithLoc.loc.lng]
      : activeTrail?.points[0]
      ? [activeTrail.points[0].lat, activeTrail.points[0].lng]
      : firstTrailWithPoints?.points[0]
      ? [firstTrailWithPoints.points[0].lat, firstTrailWithPoints.points[0].lng]
      : defaultPosition
    : defaultPosition;

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="h-[420px] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {entries
        .filter((e) => e.loc)
        .map((entry) => (
          <Marker key={entry.id} position={[entry.loc!.lat, entry.loc!.lng]} icon={icon}>
            <Popup>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{new Date(entry.ts).toLocaleString()}</p>
                <p className="whitespace-pre-wrap">{entry.text || '（テキストなし）'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      {[...trails, ...(activeTrail ? [activeTrail] : [])]
        .filter((trail) => trail.points.length > 1)
        .map((trail) => (
          <Polyline
            key={trail.id}
            positions={trail.points.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#386641', weight: 4, opacity: 0.7 }}
          >
            {trail.distanceM ? (
              <Popup>
                <p className="text-sm font-semibold">
                  散歩距離 {formatDistance(trail.distanceM, unit)}
                </p>
              </Popup>
            ) : null}
          </Polyline>
        ))}
    </MapContainer>
  );
}
