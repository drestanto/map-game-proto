import { buildMap } from '../src-v2/map/campusMap';

const { map } = buildMap();

const lines = map.map((row, r) => {
  const cells = row.map(cell => JSON.stringify(cell)).join(', ');
  return `  [${cells}], // row ${String(r).padStart(2, '0')}`;
});

console.log('export const MAP: string[][] = [');
console.log(lines.join('\n'));
console.log('];');
