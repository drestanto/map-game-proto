// ─── Constants ───────────────────────────────────────────────────────────────
export const MAP_COLS  = 38;
export const MAP_ROWS  = 32;
export const TILE_SIZE = 32;

// ─── Tile codes (always the FIRST char in a cell string) ─────────────────────
// W = wall, F = floor/corridor, R = room interior, L = library, D = door
export const TC = {
  WALL:    'W',
  FLOOR:   'F',
  ROOM:    'R',
  LIBRARY: 'L',
  DOOR:    'D',
} as const;

// ─── Object codes ─────────────────────────────────────────────────────────────
// Uppercase char  = origin tile of the object (top-left corner)
// Lowercase char  = body tile (occupied by a multi-tile object whose origin
//                  is somewhere to the upper-left)
// Special bodies  : '1'→'!', '2'→'@', '3'→'#', '4'→'$'  (non-alpha origins)
//
// Cell layout example — DESK_FRONT (3 wide × 2 tall) placed at (col=2, row=3):
//   map[3][2] = "RX"   map[3][3] = "Rx"   map[3][4] = "Rx"
//   map[4][2] = "Rx"   map[4][3] = "Rx"   map[4][4] = "Rx"
//
// Reading a cell bottom→top: first char = tile, remaining = stacked objects.

// Single-tile objects
export const OC = {
  BIN:            'B',  // 1×1
  CHAIR_FRONT:    'U',  // 1×1
  CHAIR_BACK:     'Y',  // 1×1
  BENCH_CUSHION:  'I',  // 1×1
  BENCH_WOODEN:   'J',  // 1×1
  COFFEE_MACHINE: 'E',  // 1×1
  POT:            'O',  // 1×1

  // Multi-tile (uppercase = origin)
  WHITEBOARD:        'V',  // 2w × 2h
  DESK:              'X',  // 3w × 2h
  PC:                'Q',  // 1w × 2h
  BOOKSHELF:         'S',  // 2w × 1h
  DBL_BOOKSHELF:     'T',  // 2w × 2h
  SMALL_TABLE:       'M',  // 2w × 2h
  COFFEE_TABLE:      'N',  // 2w × 2h
  SOFA_FRONT:        'A',  // 2w × 1h
  SOFA_BACK:         'G',  // 2w × 1h
  PLANT:             'P',  // 1w × 2h
  PLANT_2:           'Z',  // 1w × 2h
  HANGING_PLANT:     'H',  // 1w × 2h
  CACTUS:            'C',  // 1w × 2h
  CLOCK:             'K',  // 1w × 2h
  SMALL_PAINTING:    '3',  // 1w × 2h  (body = '#')
  SMALL_PAINTING_2:  '4',  // 1w × 2h  (body = '$')
  LARGE_PLANT:       '1',  // 2w × 3h  (body = '!')
  LARGE_PAINTING:    '2',  // 2w × 2h  (body = '@')
} as const;

// Size registry [width, height] in tiles. 1×1 = no body cells needed.
export const OBJ_SIZES: Record<string, [number, number]> = {
  'B': [1,1], 'U': [1,1], 'Y': [1,1], 'I': [1,1], 'J': [1,1],
  'E': [1,1], 'O': [1,1],
  'V': [2,2], 'X': [3,2], 'Q': [1,2], 'S': [2,1], 'T': [2,2],
  'M': [2,2], 'N': [2,2], 'A': [2,1], 'G': [2,1], 'P': [1,2],
  'Z': [1,2], 'H': [1,2], 'C': [1,2], 'K': [1,2],
  '3': [1,2], '4': [1,2], '1': [2,3], '2': [2,2],
};

// Body char for non-alpha origin codes
export function bodyChar(origin: string): string {
  const special: Record<string, string> = { '1':'!', '2':'@', '3':'#', '4':'$' };
  return special[origin] ?? origin.toLowerCase();
}

// Asset key → Phaser texture key (must match PreloadScene.preload keys)
export const OBJ_ASSET: Record<string, string> = {
  'V': 'WHITEBOARD',        'X': 'DESK_FRONT',       'Q': 'PC_FRONT_ON_1',
  'S': 'BOOKSHELF',         'T': 'DOUBLE_BOOKSHELF',  'M': 'SMALL_TABLE_FRONT',
  'N': 'COFFEE_TABLE',      'A': 'SOFA_FRONT',        'G': 'SOFA_BACK',
  'P': 'PLANT',             'Z': 'PLANT_2',            'H': 'HANGING_PLANT',
  'C': 'CACTUS',            'K': 'CLOCK',             'B': 'BIN',
  'U': 'CUSHIONED_CHAIR_FRONT', 'Y': 'CUSHIONED_CHAIR_BACK',
  'I': 'CUSHIONED_BENCH',   'J': 'WOODEN_BENCH',
  'E': 'COFFEE',            'O': 'POT',
  '1': 'LARGE_PLANT',       '2': 'LARGE_PAINTING',
  '3': 'SMALL_PAINTING',    '4': 'SMALL_PAINTING_2',
};

// Room tint bounds [r1, c1, r2, c2, hexTint]
export const ROOM_TINTS: [number,number,number,number,number][] = [
  [1,  1,  8,  9,  0xe0f0ff], // Kelas 101     — sky blue
  [1,  10, 8,  18, 0xe8ffe0], // Kelas 102     — mint green
  [1,  19, 8,  27, 0xfff0e0], // Ruang Dosen   — warm amber
  [1,  28, 8,  36, 0xf0e0ff], // Lab Komputer  — soft purple
  [11, 1,  21, 8,  0xffe8d8], // Kantin        — warm peach
  [11, 29, 21, 36, 0xe0f4ff], // Tata Usaha    — cool blue
  [23, 1,  31, 9,  0xffe0e0], // Musholla      — rose
  [23, 10, 31, 18, 0xfffff0], // Aula          — ivory
  [23, 19, 31, 27, 0xe0ffe0], // UKM Center    — sage green
  [23, 28, 31, 36, 0xffe0f8], // Ruang Rapat   — orchid
];
