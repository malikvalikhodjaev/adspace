import soato from './soato-locations.json';

export type District = { code: string; uz: string; ru: string };
export type City = {
  code: string;
  uz: string;
  ru: string;
  regionUz: string;
  regionRu: string;
  districts: District[];
};

export const cities: City[] = soato.cities;
export const locationSource = soato.source;

export function cityByCode(code: string) {
  return cities.find((city) => city.code === code);
}

export function cityOptions(uz: boolean): [string, string][] {
  return cities.map((city) => [
    city.code,
    `${uz ? city.uz : city.ru} · ${uz ? city.regionUz : city.regionRu}`,
  ]);
}

export function districtOptions(city: City, uz: boolean): [string, string][] {
  return city.districts.map((district) => [
    district.code,
    uz ? district.uz : district.ru,
  ]);
}
