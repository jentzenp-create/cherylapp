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

async function update() {
  const { data, error } = await supabase
    .from('manuals')
    .update({ pdf_url: '/Systemic_Constellations.pdf' })
    .eq('title', 'Systemic Constellations')
  
  if (error) {
    console.error('Error updating manual:', error)
  } else {
    console.log('Successfully updated Systemic Constellations to local PDF path.')
  }
}

update()
