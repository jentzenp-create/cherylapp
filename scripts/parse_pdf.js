#!/usr/bin/env node
/**
 * PDF Parser (Node.js version) — Therapy Practice App
 * =====================================================
 * Usage:
 *   node scripts/parse_pdf.js --pdf "Systemic Constellations.pdf" --title "Systemic Constellations"
 *
 * Run from the project root: c:/Users/KHUserEnglish/Documents/Vibecoding/Cheryl Web App/
 *
 * Section detection strategy for Systemic Constellations PDF:
 *   The structure is page-number-based: a standalone page number line signals
 *   that the NEXT non-blank line is a section heading.
 *   Chapter vs section is determined by case-insensitive match against known chapter titles.
 */

const fs = require('fs')
const path = require('path')

// Load env vars from app/.env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', 'app', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: app/.env.local not found')
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.+)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in app/.env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
const pdfArg = getArg('--pdf')
const title = getArg('--title')
const description = getArg('--desc') || ''
const dryRun = args.includes('--dry-run')

if (!pdfArg || !title) {
  console.error('Usage: node scripts/parse_pdf.js --pdf "path/to/file.pdf" --title "Title" [--desc "Description"] [--dry-run]')
  process.exit(1)
}

const pdfPath = path.resolve(pdfArg)
if (!fs.existsSync(pdfPath)) {
  console.error(`ERROR: PDF not found at: ${pdfPath}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Known chapter titles for Systemic Constellations (lowercase for comparison)
// These are the major chapter headings — everything else is a section within
// the current chapter.
// ─────────────────────────────────────────────────────────────────────────────
const CHAPTER_TITLES = new Set([
  'introduction to the constellations',
  'rules for constellating',
  'mini family constellation',
  'family constellation',
  'organizational constellation',
  'constellation with symbols',
  'combined constellation',
  'exercises for transforming consciousness',
  'exercises for transforming consciousness in the systems',
])

function isChapterTitle(text) {
  const lower = text.toLowerCase().trim()
  // Exact match
  if (CHAPTER_TITLES.has(lower)) return true
  // Starts-with match for longer variants (e.g. "Exercises for Transforming Consciousness in the Systems")
  for (const ch of CHAPTER_TITLES) {
    if (lower.startsWith(ch)) return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert an array of body-text lines into HTML
// Groups consecutive bullet lines into <ul>, everything else into <p>
// ─────────────────────────────────────────────────────────────────────────────
function blocksToHtml(lines) {
  // Normalize double-spaces from PDF extraction
  const normalized = lines.map(l => l.replace(/  +/g, ' ').trim()).filter(Boolean)

  const parts = []
  let bulletBuffer = []
  let paraBuffer = []

  function flushPara() {
    if (paraBuffer.length) {
      parts.push(`<p>${paraBuffer.join(' ')}</p>`)
      paraBuffer = []
    }
  }
  function flushBullets() {
    if (bulletBuffer.length) {
      parts.push(`<ul>${bulletBuffer.map(b => `<li>${b}</li>`).join('')}</ul>`)
      bulletBuffer = []
    }
  }

  for (const line of normalized) {
    if (line.startsWith('•') || line.startsWith('-\t') || line.startsWith('· ')) {
      flushPara()
      bulletBuffer.push(line.replace(/^[•·\-]\s*/, '').trim())
    } else {
      flushBullets()
      paraBuffer.push(line)
    }
  }
  flushPara()
  flushBullets()

  return parts.join('\n')
}

async function main() {
  const pdfParsePath = path.join(__dirname, '..', 'app', 'node_modules', 'pdf-parse')
  const pdfParse = require(pdfParsePath)

  async function supabaseInsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Supabase insert failed (${table}): ${err}`)
    }
    return res.json()
  }

  console.log(`📖 Opening: ${pdfPath}`)
  const pdfBuffer = fs.readFileSync(pdfPath)
  const pdf = await pdfParse(pdfBuffer)
  const rawText = pdf.text

  console.log(`   ${pdf.numpages} pages detected`)
  console.log(`   Parsing text blocks...`)
  if (dryRun) console.log(`   [DRY RUN — no Supabase writes]\n`)

  const rawLines = rawText.split('\n')

  // ── Page-number-based section detection ────────────────────────────────────
  //
  // Pattern: a standalone page-number line (digits only) signals that the
  // NEXT non-blank, non-noise line is a section (or chapter) heading.
  //
  // State machine:
  //   afterPageNum = true  → the next real line is a heading candidate
  //   afterPageNum = false → line is body content (if we're inside a chapter)
  //
  // Front matter is skipped until the first chapter heading is found.
  // ──────────────────────────────────────────────────────────────────────────

  const sections = []
  let currentChapter = null
  let currentTitle = null
  let currentBody = []
  let order = 0
  let afterPageNum = false
  let currentPageNum = 1

  function isPageNumber(line) {
    return /^\s*\d+\s*$/.test(line)
  }

  function isNoiseLine(line) {
    const t = line.trim()
    if (!t) return true                         // blank
    if (/^\d+$/.test(t)) return true            // standalone page number
    if (/\.{4,}/.test(t)) return true           // TOC dot-leaders
    if (!/[a-zA-Z0-9]/.test(t)) return true     // only punctuation/symbols
    return false
  }

  // A real heading (after a page break) must:
  //   - start with an uppercase letter, digit, or opening paren
  //   - not contain double-spaces (PDF body text is often justified with 2-space gaps)
  //   - not be a short ordinal fragment like "st", "nd", "rd", "th"
  function isHeadingCandidate(text) {
    const t = text.trim()
    if (!/^[A-Z0-9(]/.test(t)) return false         // must start uppercase/digit
    if (/  /.test(t)) return false                   // double-spaces = PDF-justified body text
    if (/^(st|nd|rd|th)$/i.test(t)) return false    // ordinal fragments
    return true
  }

  function flushSection() {
    if (currentChapter !== null && currentTitle !== null && currentBody.length > 0) {
      sections.push({
        chapter: currentChapter,
        title: currentTitle,
        body: [...currentBody],
        order: order++,
        page_number: currentPageNum,
      })
    }
    currentBody = []
  }

  for (const line of rawLines) {
    if (isPageNumber(line)) {
      // A standalone page number — next real content line is a heading
      afterPageNum = true
      currentPageNum = parseInt(line.trim(), 10)
      continue
    }

    if (isNoiseLine(line)) {
      // Noise (blank, TOC, symbols) — don't reset afterPageNum so the
      // signal carries across blank lines between page number and heading
      continue
    }

    const trimmed = line.trim()

    if (afterPageNum) {
      // This line is the heading candidate that follows a page number
      afterPageNum = false

      if (!isHeadingCandidate(trimmed)) {
        // Starts lowercase or is a diagram/fragment → body continuation, not a heading
        if (currentChapter !== null) {
          currentBody.push(trimmed)
        }
      } else if (isChapterTitle(trimmed)) {
        // Major chapter heading
        flushSection()
        currentChapter = trimmed
        currentTitle = trimmed
      } else {
        // Section heading within the current chapter
        if (currentChapter !== null) {
          flushSection()
          currentTitle = trimmed
        }
        // If no chapter yet, this is front matter — skip
      }
    } else {
      // Regular body line
      if (currentChapter !== null) {
        currentBody.push(trimmed)
      }
    }
  }
  flushSection()

  console.log(`✓ Parsed ${sections.length} sections across ${[...new Set(sections.map(s => s.chapter))].length} chapters`)

  if (dryRun) {
    console.log('\n── DRY RUN: Section list ─────────────────────────────────')
    const chapters = [...new Set(sections.map(s => s.chapter))]
    for (const ch of chapters) {
      const chSections = sections.filter(s => s.chapter === ch)
      console.log(`\n  CHAPTER: ${ch} (${chSections.length} sections)`)
      for (const s of chSections) {
        const preview = s.body.slice(0, 2).join(' ').replace(/  +/g, ' ').substring(0, 80)
        console.log(`    [${String(s.order).padStart(3, '0')}] ${s.title} (Page ${s.page_number})`)
        if (preview) console.log(`         → ${preview}…`)
      }
    }
    console.log('\n── End dry run ───────────────────────────────────────────')
    return
  }

  // ── Insert manual ──────────────────────────────────────────────────────────
  console.log(`\nInserting into Supabase...`)
  const [manualRecord] = await supabaseInsert('manuals', {
    title,
    description: description || null,
  })
  const manualId = manualRecord.id
  console.log(`✓ Created manual: ${manualId}`)

  // ── Insert sections ────────────────────────────────────────────────────────
  for (const sec of sections) {
    const htmlContent = blocksToHtml(sec.body)

    await supabaseInsert('manual_sections', {
      manual_id: manualId,
      chapter: sec.chapter,
      title: sec.title,
      content: htmlContent || '<p></p>',
      order_idx: sec.order,
      page_number: sec.page_number,
      image_urls: [],
    })

    process.stdout.write(`  ✓ [${String(sec.order).padStart(3, '0')}] ${sec.chapter} › ${sec.title}\n`)
  }

  console.log(`\n🎉 Done! "${title}" imported with ${sections.length} sections.`)
  console.log(`   Manual ID: ${manualId}`)
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
