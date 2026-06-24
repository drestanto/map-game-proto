import { OBJ_ASSET, OBJ_SIZES } from './codes';

// ─── Room metadata ────────────────────────────────────────────────────────────
export interface RoomInfo {
  id: string;
  name: string;
  description: string;
  labelCol: number; labelRow: number;
  triggerCol: number; triggerRow: number;
}

export const ROOMS: RoomInfo[] = [
  {
    id: 'kelas_101', name: 'Kelas 101',
    description: 'Ruang kuliah mata kuliah umum\nKapasitas: 40 mahasiswa\nFasilitas: proyektor, AC, whiteboard',
    labelCol: 5,  labelRow: 4,  triggerCol: 5,  triggerRow: 9,
  },
  {
    id: 'kelas_102', name: 'Kelas 102',
    description: 'Ruang kuliah mata kuliah teknik\nKapasitas: 40 mahasiswa\nFasilitas: proyektor, AC, whiteboard',
    labelCol: 14, labelRow: 4,  triggerCol: 14, triggerRow: 9,
  },
  {
    id: 'ruang_dosen', name: 'Ruang Dosen',
    description: 'Ruang kerja & konsultasi dosen\nJam layanan: Senin–Jumat 08:00–16:00\nPerlukan janji sebelum berkunjung',
    labelCol: 23, labelRow: 4,  triggerCol: 23, triggerRow: 9,
  },
  {
    id: 'lab_komputer', name: 'Lab Komputer',
    description: 'Laboratorium komputer\n30 unit PC spesifikasi tinggi\nReservasi via portal mahasiswa',
    labelCol: 32, labelRow: 4,  triggerCol: 32, triggerRow: 9,
  },
  {
    id: 'kantin', name: 'Kantin',
    description: 'Kantin kampus Cakrawala\nBuka: Senin–Jumat 07:00–17:00\nMenu lengkap, harga mahasiswa',
    labelCol: 4,  labelRow: 15, triggerCol: 9,  triggerRow: 15,
  },
  {
    id: 'tata_usaha', name: 'Tata Usaha',
    description: 'Administrasi & layanan mahasiswa\nJam: Senin–Jumat 08:00–15:00\nPelayanan: KRS, surat, transkip',
    labelCol: 32, labelRow: 15, triggerCol: 28, triggerRow: 15,
  },
  {
    id: 'perpustakaan', name: 'Perpustakaan',
    description: 'Perpustakaan Kampus Cakrawala\nKoleksi: 10.000+ buku & jurnal\nBuka: Senin–Sabtu 08:00–20:00\nFasilitas: area baca, WiFi, komputer',
    labelCol: 18, labelRow: 15, triggerCol: 18, triggerRow: 10,
  },
  {
    id: 'musholla', name: 'Musholla',
    description: 'Musholla Al-Hikmah\nBuka setiap saat\nFasilitas: tempat wudhu, mukena',
    labelCol: 5,  labelRow: 27, triggerCol: 5,  triggerRow: 22,
  },
  {
    id: 'aula', name: 'Aula',
    description: 'Aula Cakrawala\nKapasitas: 200 orang\nUntuk acara seminar, wisuda, dll\nReservasi: TU minimal H-3',
    labelCol: 14, labelRow: 27, triggerCol: 14, triggerRow: 22,
  },
  {
    id: 'ukm', name: 'UKM Center',
    description: 'Pusat Kegiatan Mahasiswa\nOrganisasi aktif: 20+ UKM\nDaftar: awal semester, sekretariat UKM',
    labelCol: 23, labelRow: 27, triggerCol: 23, triggerRow: 22,
  },
  {
    id: 'ruang_rapat', name: 'Ruang Rapat',
    description: 'Ruang Rapat & Seminar\nKapasitas: 30 orang\nFasilitas: proyektor, konferensi video\nReservasi via TU',
    labelCol: 32, labelRow: 27, triggerCol: 32, triggerRow: 22,
  },
];

// ─── Object placement (parsed from MAP at startup) ────────────────────────────
export interface ObjectPlacement {
  assetKey: string;
  col: number;
  row: number;
  flipX: boolean;
}

// ─── The Map ──────────────────────────────────────────────────────────────────
// Each cell is a string read bottom→top:
//   first char  = tile type  (W wall · F floor · R room · L library · D door)
//   extra chars = stacked objects, bottom first
//   Uppercase   = origin of an object (top-left corner of its bounding box)
//   lowercase   = body cell (occupied by an object whose origin is elsewhere)
//
// Object codes → see codes.ts (OC / OBJ_ASSET / OBJ_SIZES)
//
// Example cells:
//   "W"      plain wall
//   "R"      plain room floor
//   "RX"     room floor + desk origin (top-left of 3×2 desk)
//   "Rx"     room floor + desk body cell
//   "RXQ"    room floor + desk origin + PC stacked on top of desk

export const MAP: string[][] = [
  ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W"], // row 00
  ["W", "W", "W", "WV", "Wv", "W", "W", "W", "W", "W", "W", "W", "WV", "Wv", "W", "W", "W", "W", "W", "W", "WV", "Wv", "W", "W", "W", "W", "W", "W", "W", "WV", "Wv", "W", "W", "W", "W", "W", "W", "W"], // row 01
  ["W", "R", "R", "Rv", "Rv", "R", "R", "R", "R", "W", "W", "R", "Rv", "Rv", "R", "R", "R", "R", "W", "W", "RvXQ", "Rvx", "Rx", "RXQ", "Rx", "Rx", "RP", "W", "W", "RvQ", "RvQ", "RQ", "RQ", "RQ", "RQ", "R", "W", "W"], // row 02
  ["W", "W", "RX", "Rx", "Rx", "RX", "Rx", "Rx", "R", "W", "W", "RX", "Rx", "Rx", "RX", "Rx", "Rx", "R", "W", "W", "Rxq", "Rx", "Rx", "Rxq", "Rx", "Rx", "Rp", "W", "W", "Rq", "Rq", "Rq", "Rq", "Rq", "Rq", "R", "W", "W"], // row 03
  ["W", "W", "Rx", "Rx", "Rx", "Rx", "Rx", "Rx", "R", "W", "W", "Rx", "Rx", "Rx", "Rx", "Rx", "Rx", "R", "W", "W", "R", "RU", "R", "R", "RU", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W"], // row 04
  ["W", "W", "RX", "Rx", "Rx", "RX", "Rx", "Rx", "RP", "W", "W", "RX", "Rx", "Rx", "RX", "Rx", "Rx", "RC", "W", "W", "RXQ", "Rx", "Rx", "RXQ", "Rx", "Rx", "R", "W", "W", "RQ", "RQ", "RQ", "RQ", "RQ", "RQ", "R", "W", "W"], // row 05
  ["W", "W", "Rx", "Rx", "Rx", "Rx", "Rx", "Rx", "Rp", "W", "W", "Rx", "Rx", "Rx", "Rx", "Rx", "Rx", "Rc", "W", "W", "Rxq", "Rx", "Rx", "Rxq", "Rx", "Rx", "R", "W", "W", "Rq", "Rq", "Rq", "Rq", "Rq", "Rq", "R", "W", "W"], // row 06
  ["W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "RB", "W", "W"], // row 07
  ["W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "W", "W", "D", "D", "W", "W", "W", "W"], // row 08
  ["W", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "W"], // row 09
  ["W", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "W"], // row 10
  ["W", "W", "W", "W", "W", "W", "W", "W", "W", "F", "F", "F", "F", "W", "W", "W", "W", "D", "D", "D", "D", "W", "W", "W", "W", "F", "F", "F", "F", "W", "W", "W", "W", "W", "W", "W", "W", "W"], // row 11
  ["W", "W", "RX", "Rx", "Rx", "R", "R1", "R!", "W", "F", "F", "F", "F", "W", "LT", "Lt", "LT", "Lt", "LT", "Lt", "LT", "Lt", "LT", "LtH", "W", "F", "F", "F", "F", "W", "RXQ", "Rx", "Rx", "RS", "Rs", "RK", "W", "W"], // row 12
  ["W", "W", "RxE", "Rx", "Rx", "R", "R!", "R!", "W", "F", "F", "F", "F", "W", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lth", "W", "F", "F", "F", "F", "W", "Rxq", "Rx", "Rx", "RS", "Rs", "Rk", "W", "W"], // row 13
  ["W", "W", "R", "R", "R", "R", "R!", "R!", "W", "F", "F", "F", "F", "W", "L", "LMY", "Lm", "L", "L", "LMY", "Lm", "L", "LQ", "L", "W", "F", "F", "F", "F", "W", "R", "RU", "R", "R", "R", "R", "W", "W"], // row 14
  ["W", "W", "RN", "Rn", "R", "RN", "Rn", "R", "D", "F", "F", "F", "F", "W", "L", "Lm", "Lm", "L", "L", "Lm", "Lm", "L", "Lq", "L", "W", "F", "F", "F", "F", "D", "R", "R", "R", "RS", "Rs", "R", "W", "W"], // row 15
  ["W", "W", "Rn", "Rn", "R", "Rn", "Rn", "R", "D", "F", "F", "F", "F", "W", "L", "LU", "LU", "L", "L", "LU", "LU", "L", "L", "L", "W", "F", "F", "F", "F", "D", "RXQ", "Rx", "Rx", "R", "R", "R", "W", "W"], // row 16
  ["W", "W", "RU", "RU", "R", "RU", "RU", "R", "W", "F", "F", "F", "F", "W", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "W", "F", "F", "F", "F", "W", "Rxq", "Rx", "Rx", "RS", "Rs", "R", "W", "W"], // row 17
  ["W", "W", "RN", "Rn", "R", "RN", "Rn", "R", "W", "F", "F", "F", "F", "W", "LT", "Lt", "LT", "Lt", "LT", "Lt", "LT", "Lt", "LT", "Lt", "W", "F", "F", "F", "F", "W", "R", "R", "R", "R", "R", "R", "W", "W"], // row 18
  ["W", "W", "Rn", "Rn", "R", "Rn", "Rn", "R", "W", "F", "F", "F", "F", "W", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "Lt", "W", "F", "F", "F", "F", "W", "R", "R", "R", "R", "R", "RP", "W", "W"], // row 19
  ["W", "W", "RU", "RU", "R", "RU", "RU", "RB", "W", "F", "F", "F", "F", "W", "W", "W", "W", "D", "D", "D", "D", "W", "W", "W", "W", "F", "F", "F", "F", "W", "R", "R", "R", "R", "RB", "Rp", "W", "W"], // row 20
  ["W", "W", "W", "W", "W", "W", "W", "W", "W", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "W", "W", "W", "W", "W", "W", "W", "W", "W"], // row 21
  ["W", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "W"], // row 22
  ["W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "W", "D", "D", "W", "W", "W", "W", "W", "W", "WV", "Wv", "D", "D", "W", "W", "W", "W"], // row 23
  ["W", "W", "R3", "R", "R", "R", "R", "R", "RH", "W", "W", "RP", "RX", "Rx", "Rx", "R2", "R@", "RP", "W", "W", "RZ", "R", "R", "R", "R", "R1", "R!", "W", "W", "RY", "RvY", "RvY", "RY", "RY", "RY", "RK", "W", "W"], // row 24
  ["W", "W", "R#I", "R", "RI", "R", "RI", "R", "Rh", "W", "W", "Rp", "Rx", "Rx", "Rx", "R@", "R@", "Rp", "W", "W", "RGz", "Rg", "RG", "Rg", "R4", "R!", "R!", "W", "W", "RX", "Rx", "Rx", "RX", "Rx", "Rx", "Rk", "W", "W"], // row 25
  ["W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "RN", "Rn", "R", "R$", "R!", "R!", "W", "W", "Rx", "Rx", "Rx", "Rx", "Rx", "Rx", "R", "W", "W"], // row 26
  ["W", "W", "RI", "R", "RI", "R", "RI", "R", "R", "W", "W", "RJ", "RJ", "RJ", "RJ", "RJ", "RJ", "RJ", "W", "W", "R", "Rn", "Rn", "R", "R", "R", "R", "W", "W", "RU", "RU", "RU", "RU", "RU", "RU", "R", "W", "W"], // row 27
  ["W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "RA", "Ra", "RA", "Ra", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W"], // row 28
  ["W", "W", "RI", "R", "RI", "R", "RI", "R", "R", "W", "W", "RJ", "RJ", "RJ", "RJ", "RJ", "RJ", "RJ", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "RP", "W", "W"], // row 29
  ["W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "R", "W", "W", "R", "R", "R", "R", "R", "R", "RB", "W", "W", "R", "R", "R", "R", "R", "R", "Rp", "W", "W"], // row 30
  ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W"], // row 31
];

// ─── Parse objects from MAP ───────────────────────────────────────────────────
// Scan every cell, find uppercase object codes, emit one ObjectPlacement each.
// Body cells (lowercase / special) are skipped — they're just occupancy markers.

const ORIGIN_CHARS = new Set(Object.keys(OBJ_ASSET));

export function parseObjects(): ObjectPlacement[] {
  const objects: ObjectPlacement[] = [];
  for (let row = 0; row < MAP.length; row++) {
    for (let col = 0; col < MAP[row].length; col++) {
      const cell = MAP[row][col];
      for (let i = 1; i < cell.length; i++) {          // skip tile char at [0]
        const ch = cell[i];
        if (ORIGIN_CHARS.has(ch)) {
          objects.push({ assetKey: OBJ_ASSET[ch], col, row, flipX: false });
        }
      }
    }
  }
  return objects;
}
