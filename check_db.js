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

async function check() {
  const { data, error } = await supabase.from('manuals').select('id, title, pdf_url')
  if (error) {
    console.error('Error fetching manuals:', error)
    return
  }
  console.log('--- Manuals in Database ---')
  data.forEach(m => {
    console.log(`ID: ${m.id} | Title: ${m.title} | PDF URL: ${m.pdf_url}`)
  })
}

check()
