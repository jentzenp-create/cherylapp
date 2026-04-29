'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Save, Check } from 'lucide-react'
import type { ManualSection } from '@/types'

interface Props {
  section: ManualSection
}

export default function EditView({ section }: Props) {
  const [content, setContent] = useState(section.content)
  const [title, setTitle] = useState(section.title)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    await supabase
      .from('manual_sections')
      .update({ content, title })
      .eq('id', section.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const isDirty = content !== section.content || title !== section.title

  return (
    <div className="space-y-4">
      {/* Section title */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1.5">Section title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-stone-800 focus:outline-none focus:ring-2 focus:ring-gold-300/60 transition-all text-sm font-medium"
        />
      </div>

      {/* Content textarea */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1.5">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-stone-700 focus:outline-none focus:ring-2 focus:ring-gold-300/60 transition-all text-sm leading-relaxed resize-y font-mono"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-300">
          HTML content is rendered directly. Use &lt;p&gt;, &lt;h3&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt; tags.
        </p>
        <motion.button
          onClick={handleSave}
          disabled={!isDirty || saving}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md shadow-gold-200 hover:from-gold-500 hover:to-gold-600 disabled:opacity-40'
          }`}
        >
          {saved ? (
            <><Check className="w-4 h-4" /> Saved</>
          ) : (
            <><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}</>
          )}
        </motion.button>
      </div>
    </div>
  )
}
