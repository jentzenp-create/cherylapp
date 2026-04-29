const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, 'app', '.env.local')
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.+)$/)
    if (match) env[match[1].trim()] = match[2].trim()
  }
  return env
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkSections() {
  const { data: manuals } = await supabase.from('manuals').select('id, title').eq('title', 'Systemic Constellations')
  if (!manuals || manuals.length === 0) return
  
  const manualId = manuals[0].id
  const { data: sections, error } = await supabase
    .from('manual_sections')
    .select('chapter, title, order_idx, page_number, content')
    .eq('manual_id', manualId)
    .order('order_idx')

  if (error) {
    console.error('Error fetching sections:', error)
    return
  }

  console.log(`--- Sections for ${manuals[0].title} ---`)
  sections.forEach(s => {
    const preview = s.content ? s.content.substring(0, 100).replace(/\n/g, ' ') : 'NO CONTENT'
    console.log(`[${s.order_idx}] Ch: ${s.chapter} | Title: ${s.title} | Page: ${s.page_number} | Content: ${preview}...`)
  })
}

checkSections()
