import { TC, MAP_COLS, MAP_ROWS } from './codes';

/** Extract the tile code (first char) from a cell string. */
export function tileOf(cell: string): string {
  return cell[0] ?? TC.WALL;
}

/** Returns true if a player/NPC can walk on this cell. */
export function isWalkable(cell: string): boolean {
  return tileOf(cell) !== TC.WALL;
}

/** Returns true if the cell is a specific tile type. */
export function isTile(cell: string, tileCode: string): boolean {
  return tileOf(cell) === tileCode;
}

/**
 * World-pixel coordinate → tile walkability check.
 * Used by player movement collision.
 */
export function walkableAt(
  map: string[][],
  wx: number,
  wy: number,
  tileSize: number,
): boolean {
  const col = Math.floor(wx / tileSize);
  const row = Math.floor(wy / tileSize);
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
  return isWalkable(map[row][col]);
}
