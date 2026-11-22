// properties.js — the property market of Remi Properti.
// Twelve original Indonesian-flavoured properties in four colour groups of three.
// Own every property of one colour and the opponent pays you rent at the start
// of your turn. No names, boards or artwork are taken from any commercial game.

export const RENT_PER_SET = 60;
export const WIN_MONEY = 1000;
export const START_MONEY = 200;

export const GROUPS = [
  {
    id: 'hijau',
    name: 'Hijau Daun',
    color: '#3fae5a',
    dark: '#1e6b34',
    props: [
      { id: 'warung-kopi', name: 'Warung Kopi', price: 120 },
      { id: 'toko-kelontong', name: 'Toko Kelontong', price: 140 },
      { id: 'pasar-pagi', name: 'Pasar Pagi', price: 160 },
    ],
  },
  {
    id: 'kuning',
    name: 'Kuning Mentari',
    color: '#e8b93c',
    dark: '#8a6a12',
    props: [
      { id: 'bioskop', name: 'Bioskop Rakyat', price: 170 },
      { id: 'mal-mini', name: 'Mal Mini', price: 190 },
      { id: 'arena-futsal', name: 'Arena Futsal', price: 210 },
    ],
  },
  {
    id: 'ungu',
    name: 'Ungu Senja',
    color: '#9a6bc4',
    dark: '#5a357e',
    props: [
      { id: 'galeri-seni', name: 'Galeri Seni', price: 150 },
      { id: 'studio-musik', name: 'Studio Musik', price: 180 },
      { id: 'teater', name: 'Teater Kota', price: 220 },
    ],
  },
  {
    id: 'biru',
    name: 'Biru Laut',
    color: '#3f8fd2',
    dark: '#1d5a8f',
    props: [
      { id: 'villa-pantai', name: 'Villa Pantai', price: 230 },
      { id: 'hotel-melati', name: 'Hotel Melati', price: 260 },
      { id: 'resort-danau', name: 'Resort Danau', price: 300 },
    ],
  },
];

// Flat list of every property with its group attached, in market order.
export function allProperties() {
  const list = [];
  for (const group of GROUPS) {
    for (const p of group.props) list.push({ ...p, groupId: group.id, group: group.name, color: group.color, dark: group.dark });
  }
  return list;
}

export function groupOf(propId) {
  for (const group of GROUPS) {
    if (group.props.some((p) => p.id === propId)) return group;
  }
  return null;
}

export function propertyById(propId) {
  return allProperties().find((p) => p.id === propId) ?? null;
}

// True when the owner holds every property of the property's colour group.
export function groupComplete(propId, ownedIds) {
  const group = groupOf(propId);
  if (!group) return false;
  return group.props.every((p) => ownedIds.includes(p.id));
}

// Every colour group this owner has completed.
export function completedGroups(ownedIds) {
  return GROUPS.filter((g) => g.props.every((p) => ownedIds.includes(p.id)));
}

// Rent due at the start of the owner's turn: RENT_PER_SET per completed group,
// paid by the opponent. Returns 0 when no group is complete.
export function rentDue(ownedIds) {
  return completedGroups(ownedIds).length * RENT_PER_SET;
}
