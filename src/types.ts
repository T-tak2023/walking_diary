export interface Entry {
  id: string;
  ts: number;
  text: string;
  photoBase64?: string;
  loc?: {
    lat: number;
    lng: number;
    acc?: number;
  };
}

export interface TrailPoint {
  lat: number;
  lng: number;
  ts: number;
}

export interface Trail {
  id: string;
  startedAt: number;
  endedAt?: number;
  points: TrailPoint[];
  distanceM?: number;
}

export interface Preferences {
  unit: 'metric' | 'imperial';
  photoMaxPx: number;
}

export interface AppState {
  entries: Entry[];
  trails: Trail[];
  prefs: Preferences;
}
