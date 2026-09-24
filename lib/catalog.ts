export type Surface = {
  id: string;
  name: string;
  district: string;
  address: string;
  price: number;
  lat: number;
  lng: number;
  reach: number;
  width: number;
  height: number;
  seconds: number;
  size: string;
  kind: string;
  operator: string;
};
export const surfaces: Surface[] = [
  {
    id: 'led-001',
    name: 'Ташкент Сити',
    district: 'Шайхантахур',
    address: 'Улица Ислама Каримова',
    price: 450000,
    lat: 41.316,
    lng: 69.248,
    reach: 42000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '8 × 4,5 м',
    kind: 'Уличный LED',
    operator: 'Demo City Media',
  },
  {
    id: 'led-002',
    name: 'Сквер Амира Темура',
    district: 'Мирабад',
    address: 'Проспект Амира Темура',
    price: 380000,
    lat: 41.311,
    lng: 69.279,
    reach: 35000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '6 × 3,4 м',
    kind: 'Уличный LED',
    operator: 'Demo City Media',
  },
  {
    id: 'led-003',
    name: 'Чиланзар · торговая галерея',
    district: 'Чиланзар',
    address: 'Улица Бунёдкор',
    price: 180000,
    lat: 41.282,
    lng: 69.211,
    reach: 18000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '4 × 2,25 м',
    kind: 'Indoor LED',
    operator: 'Demo Indoor Network',
  },
  {
    id: 'led-004',
    name: 'Юнусабад · городской поток',
    district: 'Юнусабад',
    address: 'Улица Ахмада Дониша',
    price: 270000,
    lat: 41.365,
    lng: 69.288,
    reach: 28000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '6 × 3,4 м',
    kind: 'Уличный LED',
    operator: 'Demo City Media',
  },
  {
    id: 'led-005',
    name: 'Мирабад · деловой квартал',
    district: 'Мирабад',
    address: 'Улица Ойбека',
    price: 240000,
    lat: 41.292,
    lng: 69.273,
    reach: 24000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '5 × 2,8 м',
    kind: 'Уличный LED',
    operator: 'Demo City Media',
  },
  {
    id: 'led-006',
    name: 'Сергели · торговый центр',
    district: 'Сергели',
    address: 'Улица Янги Сергели',
    price: 150000,
    lat: 41.23,
    lng: 69.218,
    reach: 14000,
    width: 1920,
    height: 1080,
    seconds: 15,
    size: '4 × 2,25 м',
    kind: 'Indoor LED',
    operator: 'Demo Indoor Network',
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(n) + ' сум';
