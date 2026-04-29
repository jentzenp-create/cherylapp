/**
 * cleanup_placeholder.js
 * ─────────────────────
 * Deletes the "Who Moved My Cheese?" placeholder manual from Supabase.
 * Cascades automatically to manual_sections and annotations for that manual.
 *
 * Run once from the project root after the real manual is imported:
 *   node scripts/cleanup_placeholder.js
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const envPath = path.join(__dirname, '..', 'app', '.env.local')
  const env = {}
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.+)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  })
  return env
}

async function main() {
  const env = loadEnv()
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // List all manuals so the user can see what's in the DB
  const { data: manuals, error: listErr } = await supabase
    .from('manuals')
    .select('id, title')

  if (listErr) {
    console.error('Failed to fetch manuals:', listErr.message)
    process.exit(1)
  }

  console.log('Current manuals in DB:')
  manuals.forEach(m => console.log(`  [${m.id}]  ${m.title}`))
  console.log()

  const PLACEHOLDER_TITLE = 'Who Moved My Cheese?'
  const placeholder = manuals.find(m => m.title === PLACEHOLDER_TITLE)

  if (!placeholder) {
    console.log(`"${PLACEHOLDER_TITLE}" not found — nothing to delete.`)
    return
  }

  const { error: delErr } = await supabase
    .from('manuals')
    .delete()
    .eq('id', placeholder.id)

  if (delErr) {
    console.error('Delete failed:', delErr.message)
    process.exit(1)
  }

  console.log(`Deleted "${PLACEHOLDER_TITLE}" (id: ${placeholder.id}) and all its sections.`)
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
