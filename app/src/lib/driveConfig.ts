// Google Drive integration config.
//
// The archive lives in one public folder ("chiunque abbia il link") organized as:
//   foto/<categoria>/<raccolta>/*.jpg   → gallery photo collections
//   video/<categoria>/*.mp4             → videos section (quality floor below)
//   cv/ (folder with the PDF) or a CV*.pdf / Curriculum*.pdf file in root
//
// The API key only grants read access to already-public files, but restrict it
// in Google Cloud Console to the HTTP referrer of this site. Local dev:
// app/.env.local with VITE_DRIVE_API_KEY=… ; production: the GitHub Actions
// secret of the same name, wired in .github/workflows/deploy.yml.
export const DRIVE_CONFIG = {
  rootFolderId: '1RGYyVwU8rexBPCXN3Iil2ih5xXBIbrS3',
  photoDirName: 'foto',
  videoDirName: 'video',
  cvDirName: 'cv',
  cvFilePattern: /^(cv|curriculum)/i,
  cacheKey: 'mr.drive.v1',
  cacheTtlMs: 15 * 60 * 1000,
  // Quality window: videos whose known short side is below 720p or above
  // 1080p (HD) are not listed — the archive is meant to stay 720p–1080p.
  minVideoHeight: 720,
  maxVideoHeight: 1080,
} as const

export function driveApiKey(): string {
  return (import.meta.env.VITE_DRIVE_API_KEY ?? '') as string
}

export function isDriveConfigured(): boolean {
  return driveApiKey().length > 0
}
