// ─── Tile Types ─────────────────────────────────────────────────────────────
export const TILE = {
  WALL: 0,
  FLOOR: 1,
  ROOM: 2,
  LIBRARY: 3,
  DOOR: 4,   // walkable, visually distinct door threshold
} as const;

export type TileType = (typeof TILE)[keyof typeof TILE];

// ─── Map Constants ───────────────────────────────────────────────────────────
export const MAP_COLS = 38;
export const MAP_ROWS = 32;
export const TILE_SIZE = 32;

// ─── Room Definitions ────────────────────────────────────────────────────────
export interface RoomInfo {
  id: string;
  name: string;
  description: string;
  /** Tile position for the room's name label (center of room) */
  labelCol: number;
  labelRow: number;
  /** Tile position just outside the door — triggers the "Press E" prompt */
  triggerCol: number;
  triggerRow: number;
}

export const ROOMS: RoomInfo[] = [
  // ── Top Row ──
  {
    id: 'kelas_101',
    name: 'Kelas 101',
    description: 'Ruang kuliah mata kuliah umum\nKapasitas: 40 mahasiswa\nFasilitas: proyektor, AC, whiteboard',
    labelCol: 5, labelRow: 4,
    triggerCol: 5, triggerRow: 9,
  },
  {
    id: 'kelas_102',
    name: 'Kelas 102',
    description: 'Ruang kuliah mata kuliah teknik\nKapasitas: 40 mahasiswa\nFasilitas: proyektor, AC, whiteboard',
    labelCol: 14, labelRow: 4,
    triggerCol: 14, triggerRow: 9,
  },
  {
    id: 'ruang_dosen',
    name: 'Ruang Dosen',
    description: 'Ruang kerja & konsultasi dosen\nJam layanan: Senin–Jumat 08:00–16:00\nPerlukan janji sebelum berkunjung',
    labelCol: 23, labelRow: 4,
    triggerCol: 23, triggerRow: 9,
  },
  {
    id: 'lab_komputer',
    name: 'Lab Komputer',
    description: 'Laboratorium komputer\n30 unit PC spesifikasi tinggi\nReservasi via portal mahasiswa',
    labelCol: 32, labelRow: 4,
    triggerCol: 32, triggerRow: 9,
  },

  // ── Side Left / Right ──
  {
    id: 'kantin',
    name: 'Kantin',
    description: 'Kantin kampus Cakrawala\nBuka: Senin–Jumat 07:00–17:00\nMenu lengkap, harga mahasiswa',
    labelCol: 4, labelRow: 15,
    triggerCol: 9, triggerRow: 15,
  },
  {
    id: 'tata_usaha',
    name: 'Tata Usaha',
    description: 'Administrasi & layanan mahasiswa\nJam: Senin–Jumat 08:00–15:00\nPelayanan: KRS, surat, transkip',
    labelCol: 32, labelRow: 15,
    triggerCol: 28, triggerRow: 15,
  },

  // ── Center ──
  {
    id: 'perpustakaan',
    name: 'Perpustakaan',
    description: 'Perpustakaan Kampus Cakrawala\nKoleksi: 10.000+ buku & jurnal\nBuka: Senin–Sabtu 08:00–20:00\nFasilitas: area baca, WiFi, komputer',
    labelCol: 18, labelRow: 15,
    triggerCol: 18, triggerRow: 12,
  },

  // ── Bottom Row ──
  {
    id: 'musholla',
    name: 'Musholla',
    description: 'Musholla Al-Hikmah\nBuka setiap saat\nFasilitas: tempat wudhu, mukena',
    labelCol: 5, labelRow: 27,
    triggerCol: 5, triggerRow: 22,
  },
  {
    id: 'aula',
    name: 'Aula',
    description: 'Aula Cakrawala\nKapasitas: 200 orang\nUntuk acara seminar, wisuda, dll\nReservasi: TU minimal H-3',
    labelCol: 14, labelRow: 27,
    triggerCol: 14, triggerRow: 22,
  },
  {
    id: 'ukm',
    name: 'UKM Center',
    description: 'Pusat Kegiatan Mahasiswa\nOrganisasi aktif: 20+ UKM\nDaftar: awal semester, sekretariat UKM',
    labelCol: 23, labelRow: 27,
    triggerCol: 23, triggerRow: 22,
  },
  {
    id: 'ruang_rapat',
    name: 'Ruang Rapat',
    description: 'Ruang Rapat & Seminar\nKapasitas: 30 orang\nFasilitas: proyektor, konferensi video\nReservasi via TU',
    labelCol: 32, labelRow: 27,
    triggerCol: 32, triggerRow: 22,
  },
];

// ─── Map Builder ─────────────────────────────────────────────────────────────
function drawRoom(
  map: number[][],
  r1: number, c1: number,
  r2: number, c2: number,
  interior: TileType = TILE.ROOM,
): void {
  // Draw wall outline
  for (let c = c1; c <= c2; c++) { map[r1][c] = TILE.WALL; map[r2][c] = TILE.WALL; }
  for (let r = r1; r <= r2; r++) { map[r][c1] = TILE.WALL; map[r][c2] = TILE.WALL; }
  // Fill interior
  for (let r = r1 + 1; r < r2; r++)
    for (let c = c1 + 1; c < c2; c++)
      map[r][c] = interior;
}

function door(map: number[][], r: number, c: number): void {
  map[r][c] = TILE.DOOR;
}

export function buildCampusMap(): number[][] {
  // Start: all walls
  const map: number[][] = Array.from(
    { length: MAP_ROWS },
    () => Array(MAP_COLS).fill(TILE.WALL),
  );

  // ── Fill interior with corridor floor ───────────────────────────────────
  for (let r = 1; r < MAP_ROWS - 1; r++)
    for (let c = 1; c < MAP_COLS - 1; c++)
      map[r][c] = TILE.FLOOR;

  // ── Top Rooms (rows 1–8) ────────────────────────────────────────────────
  drawRoom(map, 1, 1, 8, 9);    // Kelas 101
  drawRoom(map, 1, 10, 8, 18);  // Kelas 102
  drawRoom(map, 1, 19, 8, 27);  // Ruang Dosen
  drawRoom(map, 1, 28, 8, 36);  // Lab Komputer
  // Doors: south wall (row 8)
  door(map, 8, 4);  door(map, 8, 5);
  door(map, 8, 13); door(map, 8, 14);
  door(map, 8, 22); door(map, 8, 23);
  door(map, 8, 32); door(map, 8, 33);

  // ── Side Rooms (rows 9–22) ──────────────────────────────────────────────
  drawRoom(map, 9, 1, 22, 8);   // Kantin  (left)
  door(map, 15, 8); door(map, 16, 8);  // east door

  drawRoom(map, 9, 29, 22, 36); // Tata Usaha (right)
  door(map, 15, 29); door(map, 16, 29); // west door

  // ── Library — center building ────────────────────────────────────────────
  drawRoom(map, 11, 13, 20, 24, TILE.LIBRARY);
  door(map, 11, 18); door(map, 11, 19); // north door
  door(map, 20, 18); door(map, 20, 19); // south door

  // ── Bottom Rooms (rows 23–31) ───────────────────────────────────────────
  drawRoom(map, 23, 1, 31, 9);   // Musholla
  drawRoom(map, 23, 10, 31, 18); // Aula
  drawRoom(map, 23, 19, 31, 27); // UKM Center
  drawRoom(map, 23, 28, 31, 36); // Ruang Rapat
  // Doors: north wall (row 23)
  door(map, 23, 4);  door(map, 23, 5);
  door(map, 23, 13); door(map, 23, 14);
  door(map, 23, 22); door(map, 23, 23);
  door(map, 23, 32); door(map, 23, 33);

  return map;
}
