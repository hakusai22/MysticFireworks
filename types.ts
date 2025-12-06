export interface Coordinates {
  x: number;
  y: number;
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
