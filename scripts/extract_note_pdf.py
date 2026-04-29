"""
Extract embedded PDF from a Notability .note file.

Notability .note files are ZIP archives containing the annotated PDF,
a binary plist (Session.plist), and any audio/image assets.

Usage (run from project root):
    python scripts/extract_note_pdf.py

Output:
    app/public/Systemic_Constellations.pdf  ← ready for the parser scripts
"""

import zipfile
import os
import shutil
import sys

NOTE_PATH = 'Systemic Constellations.note'
OUT_DIR = 'note_extracted'
DEST_PATH = os.path.join('app', 'public', 'Systemic_Constellations.pdf')


def main():
    if not os.path.exists(NOTE_PATH):
        print(f'ERROR: "{NOTE_PATH}" not found. Run from the project root.')
        sys.exit(1)

    # Try to open as ZIP (standard Notability format)
    try:
        with zipfile.ZipFile(NOTE_PATH, 'r') as z:
            entries = z.namelist()
            pdfs = [e for e in entries if e.lower().endswith('.pdf')]

            if not pdfs:
                print('No PDFs found inside the .note archive.')
                print('Archive contents:', entries[:30])
                print()
                print('Fallback: try renaming "Systemic Constellations.note" to')
                print('"Systemic Constellations.zip" and extracting manually.')
                sys.exit(1)

            print(f'Found {len(pdfs)} PDF(s):')
            for p in pdfs:
                print(f'  {p}')

            os.makedirs(OUT_DIR, exist_ok=True)
            z.extractall(OUT_DIR)

    except zipfile.BadZipFile:
        print('ERROR: The .note file is not a valid ZIP archive.')
        print()
        print('This may be an older Notability format or a macOS Notes export.')
        print('Options:')
        print('  1. In Notability on iPad/Mac: Share → Export as PDF → copy the PDF here')
        print('  2. Open the .note file in Notability and export directly to PDF')
        sys.exit(1)

    # Use the first PDF found (there should only be one)
    src = os.path.join(OUT_DIR, pdfs[0])

    # Ensure app/public exists
    os.makedirs(os.path.join('app', 'public'), exist_ok=True)

    shutil.copy2(src, DEST_PATH)
    size_mb = os.path.getsize(DEST_PATH) / (1024 * 1024)
    print(f'\nCopied to: {DEST_PATH}  ({size_mb:.1f} MB)')
    print()
    print('Next steps:')
    print('  1. Dry-run the parser:')
    print('       node scripts/parse_pdf.js --pdf "app/public/Systemic_Constellations.pdf" --title "Systemic Constellations" --dry-run')
    print()
    print('  2. If output looks good, import for real:')
    print('       node scripts/parse_pdf.js --pdf "app/public/Systemic_Constellations.pdf" --title "Systemic Constellations" --desc "Systemic Constellations therapy manual"')
    print()
    print(f'  3. You can delete the "{OUT_DIR}" folder once the PDF is confirmed.')


if __name__ == '__main__':
    main()
