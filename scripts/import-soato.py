"""Build a compact city/district selector from the official SOATO workbook.

Source: https://stat.uz/images/soato-20_04_2022.xlsx
The source is published by Uzbekistan's National Statistics Committee under CC BY 4.0.
Run with: python scripts/import-soato.py path/to/soato-20_04_2022.xlsx
"""

import json
import sys
from pathlib import Path

from openpyxl import load_workbook


def main(source: Path) -> None:
    rows = list(load_workbook(source, read_only=True, data_only=True).active.values)[4:]
    entries = [row for row in rows if isinstance(row[0], int) and row[1]]
    regions = {str(row[0]): row for row in entries if len(str(row[0])) == 4}
    districts = {
        str(row[0]): row
        for row in entries
        if len(str(row[0])) == 7 and str(row[1]).endswith(' tumani')
    }

    def district(row):
        return {'code': str(row[0]), 'uz': row[1], 'ru': row[5]}

    cities = []
    for row in entries:
        code = str(row[0])
        if code == '1726':
            related = [d for key, d in districts.items() if key.startswith(code)]
            city_name_uz = 'Toshkent'
            city_name_ru = 'Ташкент'
        elif len(code) == 7 and 400 < int(code[-3:]) < 500:
            related = []
            city_name_uz = row[1]
            city_name_ru = row[5]
        elif len(code) == 10 and 500 < int(code[-3:]) < 550:
            parent = districts.get(code[:7])
            # Some district-level cities report to a regional city (e.g.
            # Yangiobod -> Angren), so they have no district in SOATO.
            related = [parent] if parent else []
            city_name_uz = row[1]
            city_name_ru = row[5]
        else:
            continue

        region = regions[code[:4]]
        cities.append({
            'code': code,
            'uz': city_name_uz,
            'ru': city_name_ru,
            'regionUz': region[1],
            'regionRu': region[5],
            'districts': [district(item) for item in related],
        })

    cities.sort(key=lambda item: (item['code'] != '1726', item['uz']))
    if len(cities) != 120 or len(districts) != 175:
        raise ValueError(f'Unexpected SOATO size: {len(cities)} cities, {len(districts)} districts')
    result = {
        'source': 'https://stat.uz/images/soato-20_04_2022.xlsx',
        'sourceDate': '2022-04-20',
        'license': 'CC BY 4.0',
        'cities': cities,
    }
    destination = Path(__file__).resolve().parent.parent / 'lib' / 'soato-locations.json'
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(cities)} cities and {len(districts)} districts to {destination}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Pass the official SOATO workbook path')
    main(Path(sys.argv[1]))
