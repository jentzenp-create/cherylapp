'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const PDFViewer = dynamic(() => import('./PDFViewer'), { ssr: false })

interface Props {
  pdfUrl: string
  manualId: string
  sectionPages: Record<string, number>
  defaultPage?: number
}

export default function PDFViewerWrapper({ pdfUrl, manualId, sectionPages, defaultPage }: Props) {
  const searchParams = useSearchParams()
  const sectionId = searchParams.get('section')
  // Reactively derive the target page from the URL — updates on every section link click
  const initialPage = (sectionId && sectionPages[sectionId]) ? sectionPages[sectionId] : defaultPage

  return <PDFViewer pdfUrl={pdfUrl} manualId={manualId} initialPage={initialPage} />
}
