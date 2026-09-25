export type ReferenceScreen = {
  id: string;
  name: string;
  place: string;
  description: string;
  size: string;
  resolution: string;
  hours: string;
  photo: string;
  source: string;
  page: number;
};

// These are documented real-world examples, not owner-published Maydonlar inventory.
// Do not derive a per-play price or available calendar slots from monthly brochures.
export const referenceScreens: ReferenceScreen[] = [
  {
    id: 'ref-7media-park-in-mall',
    name: 'Park in Mall',
    place: 'Toshkent City, Park in Mall binosi fasadi',
    description: 'Ko‘cha tomondan ko‘rinadigan keng fasad ekrani.',
    size: '10 × 72 m',
    resolution: '14 592 × 2 016 px',
    hours: '07:00–23:00',
    photo: '/reference-screens/park-in-mall.jpg',
    source: '7Media - Park in Mall.pdf',
    page: 1,
  },
  {
    id: 'ref-7media-hotel-side-3d',
    name: 'Hotel Side 3D',
    place: 'Tashkent City Mall, Botir Zokirov ko‘chasi va Luxury Avenue burchagi',
    description: 'Burchakdagi 3D effektli LED ekran.',
    size: '48 × 6,72 m',
    resolution: '9 600 × 1 344 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    photo: '/reference-screens/hotel-side-3d.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 7,
  },
  {
    id: 'ref-7media-park-side-central',
    name: 'Park Side Central',
    place: 'Tashkent City Mall, park tomoni',
    description: 'Park va savdo markaziga keluvchilarga qaragan ekran.',
    size: '12,48 × 11,52 m',
    resolution: '2 496 × 2 304 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    photo: '/reference-screens/park-side-central.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 8,
  },
  {
    id: 'ref-7media-park-side-corner',
    name: 'Park Side Corner',
    place: 'Tashkent City Mall, parkka kirish tomoni',
    description: 'Park va unga olib boradigan yo‘ldan ko‘rinadigan burchak ekrani.',
    size: '60,48 × 5,92 + 45,76 × 5,92 m',
    resolution: '12 096 × 1 184 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    photo: '/reference-screens/park-side-corner.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 9,
  },
  {
    id: 'ref-7media-zakirov-entrance',
    name: 'B. Zakirov Entrance',
    place: 'Tashkent City Mall, Botir Zokirov ko‘chasidagi kirish',
    description: 'Asosiy kirish ustidagi ikkita yonma-yon ekran.',
    size: '22,4 × 4,32 + 22,4 × 4,48 m',
    resolution: '5 600 × 1 120 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    photo: '/reference-screens/zakirov-entrance.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 10,
  },
  {
    id: 'ref-7media-big-darxan',
    name: 'Big Darxan',
    place: 'Oqqo‘rg‘on va Mustaqillik ko‘chalari chorrahasi, Pushkin metrosi yonida',
    description: 'Katta yo‘l bo‘yidagi keng LED ekran.',
    size: '36 × 10 m',
    resolution: '5 568 × 1 440 px',
    hours: '07:00–23:00',
    photo: '/reference-screens/big-darxan.jpg',
    source: '7 Media - Commercial Offer 2026.pdf',
    page: 8,
  },
  {
    id: 'ref-7media-oybek-1',
    name: 'Oybek 1',
    place: 'Oybek va Fidokor ko‘chalari chorrahasi, New World binosi yonida',
    description: 'Chorrahadagi tik formatli LED ekran.',
    size: '7 × 4 m',
    resolution: '512 × 892 px',
    hours: '07:00–23:00',
    photo: '/reference-screens/oybek-1.jpg',
    source: '7 Media - Commercial Offer 2026.pdf',
    page: 16,
  },
];
