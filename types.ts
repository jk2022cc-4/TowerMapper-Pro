
export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  icon: string;
  category?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface CustomerLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface Country {
  name: string;
  code: string;
  center: [number, number];
  zoom: number;
}

export type IconType = 'tower' | 'radio' | 'signal' | 'database' | 'map-pin';
