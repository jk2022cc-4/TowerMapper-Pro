
import { Country } from './types';

export const COUNTRIES: Country[] = [
  { name: 'Libya', code: 'LY', center: [26.3351, 17.2283], zoom: 6 },
  { name: 'United States', code: 'US', center: [37.0902, -95.7129], zoom: 4 },
  { name: 'United Kingdom', code: 'GB', center: [55.3781, -3.436], zoom: 6 },
  { name: 'Germany', code: 'DE', center: [51.1657, 10.4515], zoom: 6 },
  { name: 'France', code: 'FR', center: [46.2276, 2.2137], zoom: 6 },
  { name: 'Italy', code: 'IT', center: [41.8719, 12.5674], zoom: 6 },
  { name: 'Spain', code: 'ES', center: [40.4637, -3.7492], zoom: 6 },
  { name: 'India', code: 'IN', center: [20.5937, 78.9629], zoom: 5 },
  { name: 'Brazil', code: 'BR', center: [-14.235, -51.9253], zoom: 4 },
  { name: 'Australia', code: 'AU', center: [-25.2744, 133.7751], zoom: 4 },
  { name: 'Japan', code: 'JP', center: [36.2048, 138.2529], zoom: 5 },
  { name: 'Canada', code: 'CA', center: [56.1304, -106.3468], zoom: 3 },
  { name: 'Mexico', code: 'MX', center: [23.6345, -102.5528], zoom: 5 },
  { name: 'Egypt', code: 'EG', center: [26.8206, 30.8025], zoom: 6 },
  { name: 'Tunisia', code: 'TN', center: [33.8869, 9.5375], zoom: 7 },
  { name: 'Algeria', code: 'DZ', center: [28.0339, 1.6596], zoom: 5 },
  { name: 'Morocco', code: 'MA', center: [31.7917, -7.0926], zoom: 6 },
  { name: 'South Africa', code: 'ZA', center: [-30.5595, 22.9375], zoom: 5 },
  { name: 'Nigeria', code: 'NG', center: [9.082, 8.6753], zoom: 6 },
  { name: 'Turkey', code: 'TR', center: [38.9637, 35.2433], zoom: 6 },
  { name: 'Saudi Arabia', code: 'SA', center: [23.8859, 45.0792], zoom: 5 },
  { name: 'UAE', code: 'AE', center: [23.4241, 53.8478], zoom: 7 },
];

export const ICON_OPTIONS = [
  { label: 'Tower', value: 'tower' },
  { label: 'Radio', value: 'radio' },
  { label: 'Signal', value: 'signal' },
  { label: 'Database', value: 'database' },
  { label: 'Pin', value: 'map-pin' },
];

export const CSV_HEADERS = ['name', 'latitude', 'longitude', 'type', 'icon'];
