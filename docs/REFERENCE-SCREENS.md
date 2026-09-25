# Photographs and source-backed screen references

The public catalogue has 54 screen-reference cards with 54 distinct local photographs. They sit in the existing screen grid, not in a separate promotional section. The cards are sourced from three operators:

| Operator | Cards | Source |
| --- | ---: | --- |
| 7Media | 34 | `7Media - Park in Mall.pdf` p. 1; `7Media Commercial 2026 — Tashkent City Mall - ENG.pdf` pp. 7–10; `7 Media - Commercial Offer 2026.pdf` pp. 4–32 |
| M-Exclusive | 15 | [Operator LED catalogue](https://m-exclusive.uz/catalog/catalog.pdf), pp. 4–18 |
| Ahad Mix LED City | 5 | `file.pdf`, pp. 3–7 |

The supplied PDFs are not copied to the public repository. Photographs from 7Media and M-Exclusive were extracted from their PDF image objects. Ahad Mix slides embed the entire page as a single bitmap; only the photograph region was rendered, without retouching. `scripts/extract-reference-photos.py` reproduces the 47 newly imported local images from the three source PDFs. Seven earlier 7Media photos remain unchanged. Each reference card retains its exact source and page in the detail view, and its dimensions, resolution, hours and location were transcribed from that same page. No stock imagery or generic agency gallery photo was attributed to a particular screen.

Catalogue cards use 960×540 WebP previews prepared with `npm run photos:previews` and a Lanczos resampling kernel. The detail view continues to use the original photographs. The previews are visual derivatives only; no source PDF or original photo is overwritten.

Reference cards are not owner-published Maydonlar inventory. The operator has not connected these screens' calendar or set a Maydonlar per-play price, so the price field reads “Цена по запросу” and booking is unavailable. **The original six configured screen cards, their prices, booking rules and existing orders are unchanged and visible in the same catalogue.** A reference photograph is not attached to one of those original cards unless it is verified to depict that exact screen. Supplier monthly brochure prices have not been substituted for platform per-play or daily tariffs.

The other supplied public sites were checked on 25 September 2026: [MediaBaza](https://mediabaza.uz/), [Muna Media](https://www.munamedia.me/uz/ooh/led-screens), [Focus Ads](https://focusads.uz/uz/) and [M-Exclusive](https://m-exclusive.uz/services/led). Only the M-Exclusive downloadable catalogue provided a dependable page-by-page screen photograph and specification pairing. The other sites describe services or show gallery photos without enough screen-specific data to attribute a photo and location responsibly. They can be revisited when an operator supplies a screen passport.
