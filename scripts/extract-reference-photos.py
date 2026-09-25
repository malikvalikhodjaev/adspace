"""Extract screen photographs from the operator PDFs supplied for Maydonlar.

This copies embedded photographs without alteration where available. Ahad Mix
slides contain a single full-page bitmap, so the photograph region is rendered
from the source PDF page. The original PDF files are never changed.
"""

from pathlib import Path
import argparse
import fitz
from PIL import Image


SEVEN_MEDIA_PAGES = [4, 5, 6, 7, *range(9, 16), *range(17, 33)]
M_EXCLUSIVE_PAGES = range(4, 19)
AHAD_MIX_PAGES = range(3, 8)


def extract_largest_jpeg(document, page_number, output):
    page = document[page_number - 1]
    images = [
        item
        for item in page.get_images(full=True)
        if document.extract_image(item[0])["ext"] == "jpeg"
    ]
    if not images:
        raise ValueError(f"No JPEG photograph on page {page_number}")
    image = max(images, key=lambda item: item[2] * item[3])
    output.write_bytes(document.extract_image(image[0])["image"])


def extract_m_exclusive(document, page_number, output):
    page = document[page_number - 1]
    candidates = [item for item in page.get_images(full=True) if item[2] >= 900 and item[3] >= 500]
    if not candidates:
        raise ValueError(f"No M-Exclusive photograph on page {page_number}")
    image = max(candidates, key=lambda item: len(document.extract_image(item[0])["image"]))
    output.write_bytes(document.extract_image(image[0])["image"])


def render_ahad_mix(document, page_number, output):
    page = document[page_number - 1]
    bounds = page.rect
    photo = fitz.Rect(
        bounds.x0 + bounds.width * 0.025,
        bounds.y0 + bounds.height * 0.19,
        bounds.x0 + bounds.width * 0.505,
        bounds.y0 + bounds.height * 0.635,
    )
    pixels = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), clip=photo, alpha=False)
    Image.frombytes("RGB", (pixels.width, pixels.height), pixels.samples).save(
        output, "JPEG", quality=88, optimize=True
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seven-media", type=Path, required=True)
    parser.add_argument("--m-exclusive", type=Path, required=True)
    parser.add_argument("--ahad-mix", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    with fitz.open(args.seven_media) as document:
        for page in SEVEN_MEDIA_PAGES:
            extract_largest_jpeg(document, page, args.output / f"7media-p{page}.jpg")
    with fitz.open(args.m_exclusive) as document:
        for page in M_EXCLUSIVE_PAGES:
            extract_m_exclusive(document, page, args.output / f"m-exclusive-p{page}.jpg")
    with fitz.open(args.ahad_mix) as document:
        for page in AHAD_MIX_PAGES:
            render_ahad_mix(document, page, args.output / f"ahad-mix-p{page}.jpg")

    print(f"Extracted {len(SEVEN_MEDIA_PAGES) + len(M_EXCLUSIVE_PAGES) + len(AHAD_MIX_PAGES)} photographs")


if __name__ == "__main__":
    main()
