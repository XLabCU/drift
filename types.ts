
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface WikiArticle {
  pageid: number;
  title: string;
  dist: number;
  lat: number;
  lon: number;
}

export interface DriftEntry {
  id: string;
  timestamp: number;
  text: string;
  coords: GeoPoint;
  anchors: string[];
  voice: string;
}

export enum DriftState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  SCANNING = 'SCANNING',
  DRIFTING = 'DRIFTING',
  ERROR = 'ERROR'
}
