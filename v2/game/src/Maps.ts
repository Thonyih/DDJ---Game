// The world is a grid of identical maps, 3 wide and 4 tall.
// Map A is bottom-left; letters go left to right, then up one row:
//   J K L
//   G H I
//   D E F
//   A B C
export const GRID_COLUMNS = 3;
export const GRID_ROWS = 4;

export type Direction = 'north' | 'south' | 'east' | 'west';

// North is the top of the minimap (world -Z), east is its right side (world +X).
export const DIRECTION_STEPS: Record<Direction, { column: number; row: number }> = {
  north: { column: 0, row: 1 },
  south: { column: 0, row: -1 },
  east: { column: 1, row: 0 },
  west: { column: -1, row: 0 },
};

export function hasMap(column: number, row: number): boolean {
  return column >= 0 && column < GRID_COLUMNS && row >= 0 && row < GRID_ROWS;
}

// In letter order: A, B, C, ... L.
const MAP_NAMES = [
  'Campos de Tomar',
  'Bosque dos Templários',
  'Ruínas do Convento',
  'Túneis de Tomar',
  'Fronteira de Trancoso',
  'Campos dos Cavaleiros Fantasma',
  'Serra das Sombras',
  'Caminho de Lisboa',
  'Costa dos Navios Negros',
  'Cabo das Tormentas',
  'Ilhas dos Corsários',
  'Costa do Além-Mar',
];

export function mapLetter(column: number, row: number): string {
  return String.fromCharCode(65 + row * GRID_COLUMNS + column);
}

export function mapName(column: number, row: number): string {
  return MAP_NAMES[row * GRID_COLUMNS + column];
}
