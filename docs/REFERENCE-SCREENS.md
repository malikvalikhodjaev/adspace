# Photographs and source-backed screen references

The public catalogue has 63 screen-reference cards with 63 distinct local photographs. They sit in the existing screen grid, not in a separate promotional section. The homepage retains its original Tashkent illustration. The reference cards come from five operator catalogues:

| Operator | Cards | Source |
| --- | ---: | --- |
| 7Media | 34 | `7Media - Park in Mall.pdf` p. 1; `7Media Commercial 2026 — Tashkent City Mall - ENG.pdf` pp. 7–10; `7 Media - Commercial Offer 2026.pdf` pp. 4–32 |
| M-Exclusive | 15 | [Operator LED catalogue](https://m-exclusive.uz/catalog/catalog.pdf), pp. 4–18 |
| Ahad Mix LED City | 5 | `file.pdf`, pp. 3–7 |
| Light Media Invest | 5 | [LED advertising, five screen/location/photo groups](https://lmi.uz/led-advertising/) |
| TOPIC / Media Rebels Technologies | 4 | [GEK-112](https://topic-media.uz/locations/GEK-112/), [GEK-126](https://topic-media.uz/locations/GEK-126/), [MRT-113](https://topic-media.uz/locations/MRT-113/), [MRT-115](https://topic-media.uz/locations/MRT-115/) |

The supplied PDFs are not copied to the public repository. Photographs from 7Media and M-Exclusive were extracted from their PDF image objects. Ahad Mix slides embed the entire page as a single bitmap; only the photograph region was rendered, without retouching. `scripts/extract-reference-photos.py` reproduces the 47 previously imported local images from the three source PDFs. Seven earlier 7Media photos remain unchanged. Each PDF-based reference retains its source and page in the detail view. The nine new photographs were downloaded from the exact Light Media Invest or TOPIC screen/location pages cited above. These web references link directly to their source page; fields not published on that page are left out rather than inferred. No stock imagery or generic agency gallery photo was attributed to a particular screen.

Catalogue cards use 960×540 WebP previews prepared with `npm run photos:previews` and a Lanczos resampling kernel. The detail view continues to use the original photographs. The previews are visual derivatives only; no source PDF or original photo is overwritten. The current catalogue order takes one card per operator in turn and inserts a connected screen after every four reference cards. This is a temporary display order, not a ranking or an availability signal.

Reference cards are not owner-published Maydonlar inventory. The operator has not connected these screens' calendar or set a Maydonlar per-play price, so the price field reads “Цена по запросу” and booking is unavailable. **The original six configured screen cards, their prices, booking rules and existing orders are unchanged and visible in the same catalogue.** A reference photograph is not attached to one of those original cards unless it is verified to depict that exact screen. Supplier monthly brochure prices have not been substituted for platform per-play or daily tariffs.

The other supplied public sites were checked on 25 September 2026: [MediaBaza](https://mediabaza.uz/), [Muna Media](https://www.munamedia.me/uz/ooh/led-screens), [Focus Ads](https://focusads.uz/uz/) and [M-Exclusive](https://m-exclusive.uz/services/led). The first three describe services or show gallery photos without enough screen-specific data to attribute a photo and location responsibly. Newly found [Light Media Invest](https://lmi.uz/led-advertising/) and [TOPIC](https://topic-media.uz/locations/GEK-112/) do publish matched location/photos, so they were included as references. Their pages do not establish current Maydonlar availability, ownership confirmation or a compatible per-play tariff. They can be upgraded to bookable inventory only after operator onboarding and verification.
