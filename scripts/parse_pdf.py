"""
PDF Parser — Therapy Practice App
===================================
Parses a PDF manual and imports its content into Supabase.

Usage:
  python scripts/parse_pdf.py --pdf "path/to/manual.pdf" --title "Manual Title" --desc "Optional description"

Requirements:
  pip install pdfplumber supabase python-dotenv Pillow

Environment:
  Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (use service role key, NOT anon key)
  or pass them as env vars.
"""

import argparse
import os
import io
import re
import json
import uuid
from pathlib import Path

import pdfplumber
from PIL import Image as PILImage
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "app" / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
# Use service role key for server-side seeding (bypasses RLS)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
IMAGE_BUCKET = "manual-images"

# ─────────────────────────────────────────────────────────────────────────────
# Heading detection heuristics
# Adjust these thresholds once you have the real therapy PDFs.
# ─────────────────────────────────────────────────────────────────────────────
CHAPTER_FONT_SIZE_MIN = 16    # Font size for chapter-level headings
SECTION_FONT_SIZE_MIN = 13    # Font size for section-level headings
BODY_FONT_SIZE_MAX = 12       # Body text font size ceiling


def detect_heading_level(chars: list) -> int | None:
    """Returns 1 (chapter), 2 (section), or None (body) based on char font size."""
    if not chars:
        return None
    sizes = [c.get("size", 0) for c in chars if c.get("size")]
    if not sizes:
        return None
    avg = sum(sizes) / len(sizes)
    if avg >= CHAPTER_FONT_SIZE_MIN:
        return 1
    if avg >= SECTION_FONT_SIZE_MIN:
        return 2
    return None


def extract_page_text_and_images(page) -> tuple[list[dict], list[bytes]]:
    """
    Returns:
      blocks: list of {"type": "heading1"|"heading2"|"body", "text": str}
      images: list of PNG bytes
    """
    blocks = []
    images_bytes = []

    # Extract text blocks by line
    words = page.extract_words(extra_attrs=["size", "fontname"])
    if words:
        # Group words into lines by top-coordinate proximity
        lines: dict[float, list] = {}
        for w in words:
            top = round(w["top"], 0)
            lines.setdefault(top, []).append(w)

        for top in sorted(lines.keys()):
            line_words = lines[top]
            text = " ".join(w["text"] for w in line_words).strip()
            if not text:
                continue
            level = detect_heading_level(line_words)
            if level == 1:
                blocks.append({"type": "heading1", "text": text})
            elif level == 2:
                blocks.append({"type": "heading2", "text": text})
            else:
                blocks.append({"type": "body", "text": text})

    # Extract images
    for img_obj in page.images:
        try:
            # pdfplumber image extraction
            x0, y0, x1, y1 = img_obj["x0"], img_obj["top"], img_obj["x1"], img_obj["bottom"]
            cropped = page.crop((x0, y0, x1, y1))
            pil_img = cropped.to_image(resolution=150).original
            buf = io.BytesIO()
            pil_img.save(buf, format="PNG")
            images_bytes.append(buf.getvalue())
        except Exception as e:
            print(f"  Warning: could not extract image — {e}")

    return blocks, images_bytes


def blocks_to_html(body_blocks: list[dict]) -> str:
    """Convert body text blocks into simple HTML paragraphs."""
    paragraphs = []
    current = []

    for block in body_blocks:
        if block["type"] == "body":
            current.append(block["text"])
        else:
            if current:
                paragraphs.append("<p>" + " ".join(current) + "</p>")
                current = []
            # Sub-heading inside section content
            paragraphs.append(f"<h4>{block['text']}</h4>")

    if current:
        paragraphs.append("<p>" + " ".join(current) + "</p>")

    return "\n".join(paragraphs)


def upload_image(supabase: Client, img_bytes: bytes, manual_id: str, section_order: int, img_idx: int) -> str | None:
    """Uploads image to Supabase Storage and returns public URL."""
    filename = f"{manual_id}/{section_order:04d}_{img_idx:02d}.png"
    try:
        supabase.storage.from_(IMAGE_BUCKET).upload(
            filename,
            img_bytes,
            {"content-type": "image/png", "upsert": "true"},
        )
        res = supabase.storage.from_(IMAGE_BUCKET).get_public_url(filename)
        return res
    except Exception as e:
        print(f"  Warning: image upload failed — {e}")
        return None


def parse_and_import(pdf_path: str, title: str, description: str = ""):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in app/.env.local")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print(f"📖 Opening: {pdf_path}")
    pdf = pdfplumber.open(pdf_path)
    total_pages = len(pdf.pages)
    print(f"   {total_pages} pages detected")

    # Insert manual record
    manual_res = supabase.table("manuals").insert({
        "title": title,
        "description": description or None,
    }).execute()
    manual_id = manual_res.data[0]["id"]
    print(f"✓ Created manual: {manual_id}")

    # ── Parse pages into sections ──────────────────────────────────────────
    # A section starts at each chapter-level heading.
    # Pages without a heading are appended to the current section.

    sections: list[dict] = []
    current_chapter = "Introduction"
    current_section_title = title
    current_body: list[dict] = []
    current_images: list[bytes] = []
    order = 0

    def flush_section():
        nonlocal order
        if current_body or current_images:
            sections.append({
                "chapter": current_chapter,
                "title": current_section_title,
                "body": list(current_body),
                "images": list(current_images),
                "order": order,
            })
            order += 1

    for page_num, page in enumerate(pdf.pages, start=1):
        print(f"  Processing page {page_num}/{total_pages}...", end="\r")
        blocks, page_images = extract_page_text_and_images(page)

        for block in blocks:
            if block["type"] == "heading1":
                # New chapter — flush previous section
                flush_section()
                current_chapter = block["text"]
                current_section_title = block["text"]
                current_body.clear()
                current_images.clear()
            elif block["type"] == "heading2":
                # New section within chapter
                flush_section()
                current_section_title = block["text"]
                current_body.clear()
                current_images.clear()
            else:
                current_body.append(block)

        current_images.extend(page_images)

    flush_section()
    print(f"\n✓ Parsed {len(sections)} sections")

    # ── Insert sections into Supabase ──────────────────────────────────────
    for sec in sections:
        html = blocks_to_html(sec["body"])

        # Upload images
        image_urls = []
        for i, img_bytes in enumerate(sec["images"]):
            url = upload_image(supabase, img_bytes, manual_id, sec["order"], i)
            if url:
                image_urls.append(url)

        supabase.table("manual_sections").insert({
            "manual_id": manual_id,
            "chapter": sec["chapter"],
            "title": sec["title"],
            "content": html,
            "order_idx": sec["order"],
            "image_urls": image_urls,
        }).execute()

        print(f"  ✓ [{sec['order']:03d}] {sec['chapter']} > {sec['title']} ({len(image_urls)} images)")

    pdf.close()
    print(f"\n🎉 Done! Manual '{title}' imported with {len(sections)} sections.")
    print(f"   Manual ID: {manual_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import a PDF manual into Supabase")
    parser.add_argument("--pdf", required=True, help="Path to the PDF file")
    parser.add_argument("--title", required=True, help="Manual title")
    parser.add_argument("--desc", default="", help="Optional description")
    args = parser.parse_args()

    parse_and_import(args.pdf, args.title, args.desc)
