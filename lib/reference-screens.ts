export type ReferenceScreen = {
  id: string;
  name: string;
  place: string;
  placeRu: string;
  description?: string;
  descriptionRu?: string;
  size: string;
  resolution: string;
  hours: string;
  hoursRu: string;
  photo: string;
  source: string;
  page: number;
  supplier?: string;
  cityCode?: string | null;
};

// These are documented real-world examples, not owner-published Maydonlar inventory.
// Do not derive a per-play price or available calendar slots from monthly brochures.
const originalReferences: ReferenceScreen[] = [
  {
    id: 'ref-7media-park-in-mall',
    name: 'Park in Mall',
    place: 'Toshkent City, Park in Mall binosi fasadi',
    placeRu: 'Ташкент Сити, фасад здания Park in Mall',
    description: 'Ko‘cha tomondan ko‘rinadigan keng fasad ekrani.',
    descriptionRu: 'Широкий фасадный экран, видимый с улицы.',
    size: '10 × 72 m',
    resolution: '14 592 × 2 016 px',
    hours: '07:00–23:00',
    hoursRu: '07:00–23:00',
    photo: '/reference-screens/park-in-mall.jpg',
    source: '7Media - Park in Mall.pdf',
    page: 1,
  },
  {
    id: 'ref-7media-hotel-side-3d',
    name: 'Hotel Side 3D',
    place: 'Tashkent City Mall, Botir Zokirov ko‘chasi va Luxury Avenue burchagi',
    placeRu: 'Tashkent City Mall, угол улицы Ботира Закирова и Luxury Avenue',
    description: 'Burchakdagi 3D effektli LED ekran.',
    descriptionRu: 'Угловой LED-экран с эффектом 3D.',
    size: '48 × 6,72 m',
    resolution: '9 600 × 1 344 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    hoursRu: 'Пн–Чт 10:00–23:00 · Пт–Вс 10:00–00:00',
    photo: '/reference-screens/hotel-side-3d.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 7,
  },
  {
    id: 'ref-7media-park-side-central',
    name: 'Park Side Central',
    place: 'Tashkent City Mall, park tomoni',
    placeRu: 'Tashkent City Mall, сторона парка',
    description: 'Park va savdo markaziga keluvchilarga qaragan ekran.',
    descriptionRu: 'Экран обращён к парку и посетителям торгового центра.',
    size: '12,48 × 11,52 m',
    resolution: '2 496 × 2 304 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    hoursRu: 'Пн–Чт 10:00–23:00 · Пт–Вс 10:00–00:00',
    photo: '/reference-screens/park-side-central.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 8,
  },
  {
    id: 'ref-7media-park-side-corner',
    name: 'Park Side Corner',
    place: 'Tashkent City Mall, parkka kirish tomoni',
    placeRu: 'Tashkent City Mall, у входа в парк',
    description: 'Park va unga olib boradigan yo‘ldan ko‘rinadigan burchak ekrani.',
    descriptionRu: 'Угловой экран виден из парка и с дороги к входу.',
    size: '60,48 × 5,92 + 45,76 × 5,92 m',
    resolution: '12 096 × 1 184 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    hoursRu: 'Пн–Чт 10:00–23:00 · Пт–Вс 10:00–00:00',
    photo: '/reference-screens/park-side-corner.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 9,
  },
  {
    id: 'ref-7media-zakirov-entrance',
    name: 'B. Zakirov Entrance',
    place: 'Tashkent City Mall, Botir Zokirov ko‘chasidagi kirish',
    placeRu: 'Tashkent City Mall, вход со стороны улицы Ботира Закирова',
    description: 'Asosiy kirish ustidagi ikkita yonma-yon ekran.',
    descriptionRu: 'Два экрана над одним из главных входов.',
    size: '22,4 × 4,32 + 22,4 × 4,48 m',
    resolution: '5 600 × 1 120 px',
    hours: 'Du–Pa 10:00–23:00 · Ju–Ya 10:00–00:00',
    hoursRu: 'Пн–Чт 10:00–23:00 · Пт–Вс 10:00–00:00',
    photo: '/reference-screens/zakirov-entrance.jpg',
    source: '7Media Commercial 2026 — Tashkent City Mall - ENG.pdf',
    page: 10,
  },
  {
    id: 'ref-7media-big-darxan',
    name: 'Big Darxan',
    place: 'Oqqo‘rg‘on va Mustaqillik ko‘chalari chorrahasi, Pushkin metrosi yonida',
    placeRu: 'Перекрёсток улиц Аккурган и Мустакиллик, у метро «Пушкинская»',
    description: 'Katta yo‘l bo‘yidagi keng LED ekran.',
    descriptionRu: 'Широкий LED-экран у оживлённой дороги.',
    size: '36 × 10 m',
    resolution: '5 568 × 1 440 px',
    hours: '07:00–23:00',
    hoursRu: '07:00–23:00',
    photo: '/reference-screens/big-darxan.jpg',
    source: '7 Media - Commercial Offer 2026.pdf',
    page: 8,
  },
  {
    id: 'ref-7media-oybek-1',
    name: 'Oybek 1',
    place: 'Oybek va Fidokor ko‘chalari chorrahasi, New World binosi yonida',
    placeRu: 'Перекрёсток улиц Ойбек и Фидокор, у здания New World',
    description: 'Chorrahadagi tik formatli LED ekran.',
    descriptionRu: 'Вертикальный LED-экран у перекрёстка.',
    size: '7 × 4 m',
    resolution: '512 × 892 px',
    hours: '07:00–23:00',
    hoursRu: '07:00–23:00',
    photo: '/reference-screens/oybek-1.jpg',
    source: '7 Media - Commercial Offer 2026.pdf',
    page: 16,
  },
];

type ScreenRow = [page: number, name: string, place: string, placeRu: string, size: string, resolution: string, hours?: string];

// One row is one documented screen or named screen group on the cited brochure
// page. These photographs are not linked to a Maydonlar owner, tariff or player.
const sevenMediaRows: ScreenRow[] = [
  [4, 'Kamchik Pass — A', 'Qamchiq dovoni, Toshkentdan Namanganga yo‘nalish', 'Перевал Камчик, направление Ташкент — Наманган', '8 × 16 m', '2304 × 1152 px', '07:00–00:00'],
  [5, 'Kamchik Pass — B', 'Qamchiq dovoni, Namangandan Toshkentga yo‘nalish', 'Перевал Камчик, направление Наманган — Ташкент', '8 × 16 m', '2304 × 1152 px', '07:00–00:00'],
  [6, 'Malika', 'Malika bozori ichki avtoturargohi', 'Внутренняя парковка рынка «Малика»', '4 × 8 m · 4 tomon', '4608 × 576 px', '10:00–21:00'],
  [7, 'Karasu', 'Temur Malik ko‘chasi, Assalom Do‘rmon yonida', 'Улица Темура Малика, рядом с ЖК Assalom Do‘rmon', '3 × 6 + 4 × 8 + 3 × 6 m', '2400 × 555 px'],
  [9, 'Maxim Gorky 1', 'Mirzo Ulug‘bek va Buyuk Ipak Yo‘li chorrahasi, metro yonida', 'Перекрёсток Мирзо Улугбека и Буюк Ипак Йули, у метро', '8 × 19 m', '2432 × 1024 px'],
  [10, 'Maxim Gorky 2', 'Mirzo Ulug‘bek va Buyuk Ipak Yo‘li chorrahasi, metro yonida', 'Перекрёсток Мирзо Улугбека и Буюк Ипак Йули, у метро', '6 × 15 m', '3840 × 1440 px'],
  [11, 'Wine Factory', 'Farg‘ona yo‘li va Nukus ko‘chalari chorrahasi', 'Перекрёсток Ферганской дороги и улицы Нукус', '6 × 12 m', '1536 × 768 px'],
  [12, 'Food Street 1 — KFC', 'Taras Shevchenko va Fidokor chorrahasi, KFC tomoni', 'Перекрёсток Тараса Шевченко и Фидокор, сторона KFC', '2 × 4 m', '960 × 1920 px'],
  [13, 'Food Street 2 — Edison', 'Taras Shevchenko va Fidokor chorrahasi, Edison tomoni', 'Перекрёсток Тараса Шевченко и Фидокор, сторона Edison', '2 × 4 m', '960 × 1920 px'],
  [14, 'Food Street 3 — Perfectum', 'Taras Shevchenko ko‘chasi, Perfectum tomoni', 'Улица Тараса Шевченко, сторона Perfectum', '2 × 4 m', '960 × 1920 px'],
  [15, 'Food Street 4 — Wendy’s', 'Taras Shevchenko ko‘chasi, Wendy’s tomoni', 'Улица Тараса Шевченко, сторона Wendy’s', '2 × 4 m', '960 × 1920 px'],
  [17, 'Oybek 2', 'Oybek va Fidokor chorrahasi, Huawei ofisi qarshisi', 'Перекрёсток Ойбека и Фидокор, напротив офиса Huawei', '7 × 4 m', '512 × 892 px'],
  [18, 'Shokh Medical Center', 'Oybek va Nukus ko‘chalari chorrahasi', 'Перекрёсток улиц Ойбека и Нукус', '5 × 10 m', '1200 × 600 px'],
  [19, 'Darxan', 'Oqqo‘rg‘on va Mustaqillik chorrahasi, Pushkin metrosi yonida', 'Перекрёсток Аккурган и Мустакиллик, рядом с метро «Пушкинская»', '4 × 8 m', '960 × 480 px'],
  [20, 'TSUM 1', 'Islom Karimov va Sharof Rashidov chorrahasi, TSUM tomoni', 'Перекрёсток Ислама Каримова и Шарафа Рашидова, сторона ЦУМа', '4 × 8 m', '1024 × 512 px'],
  [21, 'TSUM 2', 'Islom Karimov va Sharof Rashidov chorrahasi, Lotte Hotel qarshisi', 'Перекрёсток Ислама Каримова и Шарафа Рашидова, напротив Lotte Hotel', '4 × 8 m', '960 × 480 px'],
  [22, 'MVD 1', 'Afrosiyob va Mirobod chorrahasi, Kosmonavtlar metrosi yonida', 'Перекрёсток Афросиаб и Мирабад, рядом с метро «Космонавты»', '4 × 8 m', '1024 × 512 px'],
  [23, 'MVD 2', 'Afrosiyob va Sharof Rashidov chorrahasi', 'Перекрёсток Афросиаб и Шарафа Рашидова', '4 × 8 m', '960 × 480 px'],
  [24, 'Mirzo Ulug‘bek monumenti', 'Mirzo Ulug‘bek va Do‘rmon Yo‘li chorrahasi', 'Перекрёсток Мирзо Улугбека и Дурмон Йули', '4 × 8 m', '960 × 480 px'],
  [25, 'C1', 'Shahrisabz va Mustaqillik chorrahasi', 'Перекрёсток Шахрисабз и Мустакиллик', '7 × 4 m', '512 × 892 px'],
  [26, 'C4', 'Sharof Rashidov va Alisher Navoiy chorrahasi, Poytaxt markazi yonida', 'Перекрёсток Шарафа Рашидова и Алишера Навои, у БЦ Poytaxt', '7 × 4 m', '512 × 892 px'],
  [27, 'Rohat Circle', 'Ohangaron shossesi va Toshkent halqa yo‘li aylanmasi', 'Круг на пересечении Ахангаранского шоссе и Ташкентской кольцевой дороги', '6 × 40 m', '1680 × 720 px'],
  [28, 'Rohat 2', 'Ohangaron shossesi, Rohat aylanmasidan 200 m oldin', 'Ахангаранское шоссе, за 200 м до круга «Рохат»', '3 × 6 m', '1920 × 1080 px'],
  [29, '5 City Hospital 1', 'Rafikov va Yangishahar chorrahasi, 5-shahar shifoxonasi yonida', 'Перекрёсток Рафикова и Янгишахар, у 5-й городской больницы', '4 × 8 m', '1024 × 512 px'],
  [30, '5 City Hospital 2', 'Rafikov va Yangishahar chorrahasi, 5-shahar shifoxonasi yonida', 'Перекрёсток Рафикова и Янгишахар, у 5-й городской больницы', '4 × 8 m', '1920 × 1080 px'],
  [31, 'Shahriston', 'Shahriston chorrahasi', 'Перекрёсток Шахристан', '4 × 8 m', '1920 × 1080 px'],
  [32, 'Roof of Novza', 'Bunyodkor shohko‘chasi, Novza tomi', 'Проспект Бунёдкор, крыша Novza', '14,4 × 5,8 m', '1800 × 720 px'],
];

const mExclusiveRows: ScreenRow[] = [
  [4, 'Samarqand Darvoza', 'Samarqand Darvoza savdo markazi fasadi', 'Фасад ТЦ «Самарканд Дарвоза»', '10 × 11,5 m', '1160 × 1400 px'],
  [5, 'Furqat', 'Furqat ko‘chasi, Magic City yo‘nalishi', 'Улица Фурката, направление к Magic City', '16 × 6 m', '1920 × 720 px'],
  [6, 'Nurafshon — Ko‘kcha Darvoza', 'Nurafshon va Ko‘kcha Darvoza chorrahasi', 'Перекрёсток Нурафшон и Кукча Дарвоза', '12 × 4 + 8 × 4 m', '1440 × 480 + 960 × 480 px'],
  [7, 'Sebzor 1', 'Sebzor ko‘chasi, G‘alaba ko‘prigidan tushish', 'Улица Себзар, спуск с моста ГАНГА, №1', '12 × 5 m · 2 ekran', '1440 × 600 px'],
  [8, 'Sebzor 2', 'Sebzor ko‘chasi, G‘alaba ko‘prigidan tushish', 'Улица Себзар, спуск с моста ГАНГА, №2', '12 × 5 m · 2 ekran', '1440 × 600 px'],
  [9, 'Yulduz Cinema', 'Mirobod va Shota Rustaveli chorrahasi', 'Перекрёсток Мирабад и Шота Руставели, крыша Yulduz Cinema', '19 × 10 m', '3480 × 1200 px'],
  [10, 'Uch Qahramon', 'Toshkent halqa yo‘li, Uch Qahramon aylanmasi', 'ТКАД, круг «Уч Кахрамон»', '26 × 4 m', '3120 × 480 px'],
  [11, 'Frunzenskiy TC', 'Shota Rustaveli va Bobur chorrahasi', 'Перекрёсток Шота Руставели и Бабура, ТЦ «Фрунзенский»', '34 × 6 m', '2040 × 720 + 4080 × 720 px'],
  [12, 'Shahrisabz — Oybek', 'Shahrisabz va Oybek chorrahasi, bino tomi', 'Перекрёсток Шахрисабз и Ойбека, крыша здания', '30 × 4 m', '1152 × 384 + 1728 × 384 px'],
  [13, 'Yunusobod 2-mavze', 'Yunusobod 2-mavze, Mega Planet yonida', 'Юнусабад, 2-й квартал, рядом с Mega Planet', '10 × 5 m', '1200 × 600 px'],
  [14, 'Yangi Sergeli ko‘prigi', 'Yangi Sergeli ko‘chasi, Sergeli ko‘prigi yonida', 'Улица Янги Сергели, у развилки моста «Сергели»', '12 × 5 m', '1440 × 600 px'],
  [15, 'Nurafshon — Donish', 'Nurafshon va Ahmad Donish chorrahasi', 'Перекрёсток Нурафшон и Ахмада Дониша', '10 × 4 m', '1200 × 480 px'],
  [16, 'Parkent — Mirzo Ulug‘bek', 'Parkent va Mirzo Ulug‘bek ko‘chalari chorrahasi', 'Перекрёсток Паркентской и Мирзо Улугбека', '8 × 4 m', '960 × 480 px'],
  [17, 'Sharof Rashidov — MKAD', 'Sharof Rashidov ko‘chasi va Toshkent halqa yo‘li', 'Перекрёсток Ш. Рашидова и МКАД', '6 × 3 m', '720 × 360 px'],
  [18, 'Sodiq Azimov — Maxtumquli', 'Sodiq Azimov va Maxtumquli chorrahasi', 'Перекрёсток С. Азимова и Махтумкули', '6 × 3 m', '720 × 360 px'],
];

const ahadMixRows: ScreenRow[] = [
  [3, 'Piramit', 'Piramit Mall fasadi, Toshkent', 'Фасад Piramit Mall, Ташкент', '48 × 6 m', '9408 × 1152 px'],
  [4, '1-Notarialniy', 'Piramit Tower yonidagi chorraha', 'Перекрёсток у Piramit Tower', '41 × 10 m', '4920 × 1200 px'],
  [5, 'Grand Mir Hotel', 'Grand Mir mehmonxonasi yonidagi chorraha', 'Перекрёсток у отеля Grand Mir', '16 × 8 m', '1800 × 700 px'],
  [6, 'Tashkent Airport', 'Toshkent aeroporti kirish qismi', 'Входная зона аэропорта Ташкента', '9,6 × 9,7 m', '1408 × 1920 px', '24/7'],
  [7, 'Sagbon', 'Sag‘bon chorrahasi', 'Перекрёсток Сагбон', '6 × 3 m', '1920 × 1080 px'],
];

function fromRows(rows: ScreenRow[], supplier: string, source: string, photoPrefix: string, extension = 'jpg'): ReferenceScreen[] {
  return rows.map(([page, name, place, placeRu, size, resolution, hours]) => ({
    id: `ref-${photoPrefix}-p${page}`,
    name,
    place,
    placeRu,
    size,
    resolution,
    hours: hours || '07:00–23:00',
    hoursRu: hours || '07:00–23:00',
    photo: `/reference-screens/${photoPrefix}-p${page}.${extension}`,
    source,
    page,
    supplier,
    cityCode: supplier === '7Media' && (page === 4 || page === 5) ? null : '1726',
  }));
}

export const referenceScreens: ReferenceScreen[] = [
  ...originalReferences,
  ...fromRows(sevenMediaRows, '7Media', '7 Media - Commercial Offer 2026.pdf', '7media'),
  ...fromRows(mExclusiveRows, 'M-Exclusive', 'M-Exclusive LED catalogue', 'm-exclusive'),
  ...fromRows(ahadMixRows, 'Ahad Mix', 'file.pdf — Ahad Mix LED City', 'ahad-mix'),
];
