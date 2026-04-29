'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/useSessionStore'
import ContentRenderer from '@/components/manual/ContentRenderer'
import type { ManualSection, Annotation } from '@/types'

interface Props {
  sectionId: string
  section: ManualSection
}

export default function ReadingView({ sectionId, section }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const { activeSession } = useSessionStore()
  const supabase = createClient()

  const fetchAnnotations = useCallback(async () => {
    // Always fetch global annotations
    let query = supabase
      .from('annotations')
      .select('*')
      .eq('section_id', sectionId)

    // If in a session, also fetch client-specific annotations for this client
    if (activeSession) {
      query = supabase
        .from('annotations')
        .select('*')
        .eq('section_id', sectionId)
        .or(`scope.eq.global,and(scope.eq.client,client_id.eq.${activeSession.clientId})`)
    } else {
      query = query.eq('scope', 'global')
    }

    const { data } = await query.order('created_at')
    setAnnotations((data as Annotation[]) ?? [])
  }, [sectionId, activeSession, supabase])

  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  return (
    <ContentRenderer
      section={section}
      annotations={annotations}
      onAnnotationChange={fetchAnnotations}
    />
  )
}
