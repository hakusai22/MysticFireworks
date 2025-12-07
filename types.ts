export interface Coordinates {
  x: number;
  y: number;
  paletteIndex?: number; // Optional index to force a specific color palette
  scale?: number; // Optional scale factor (1.0 is default)
}

export interface FireworkConfig {
  x: number;
  y: number; // Target height
  hue: number;
}

export enum GameState {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}