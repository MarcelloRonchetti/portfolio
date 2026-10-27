import { useCallback, useEffect, useState } from 'react'
import { fetchCvBlob } from '../lib/drive'
import { isDriveConfigured } from '../lib/driveConfig'

// CV download, pulled on demand: primary source is the Drive archive (blob
// fetch, never a redirect to drive.google.com); when Drive is not configured
// or unreachable the bundled PDF (same document, local copy) keeps the button
// working. The blob is cached for the session so repeats don't refetch.
let cached: { url: string; name: string } | null = null

const BUNDLED_CV = 'CV_Marcello_Ronchetti.pdf'

function saveAs(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function pullCv(): Promise<{ url: string; name: string }> {
  if (cached) return cached
  if (!isDriveConfigured()) throw new Error('not-configured')
  const { blob, filename } = await fetchCvBlob()
  cached = { url: URL.createObjectURL(blob), name: filename }
  return cached
}

export function useCvDownload(): { busy: boolean; failed: boolean; download: () => void } {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!failed) return
    const t = window.setTimeout(() => setFailed(false), 3000)
    return () => window.clearTimeout(t)
  }, [failed])

  const download = useCallback(() => {
    if (busy) return
    setBusy(true)
    pullCv()
      .then(({ url, name }) => {
        saveAs(url, name)
        setBusy(false)
      })
      .catch(() => {
        fetch(`${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/${BUNDLED_CV}`)
          .then((res) => {
            if (!res.ok) throw new Error('fallback unavailable')
            return res.blob()
          })
          .then((blob) => {
            cached = { url: URL.createObjectURL(blob), name: BUNDLED_CV }
            saveAs(cached.url, cached.name)
          })
          .catch(() => setFailed(true))
          .finally(() => setBusy(false))
      })
  }, [busy])

  return { busy, failed, download }
}
