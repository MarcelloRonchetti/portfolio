#!/usr/bin/env node
// CLI entry point — scheduled daily by .github/workflows/sync-instagram.yml.
// Uses only Node built-ins (no npm install in CI). See
// docs/superpowers/plans/2026-09-08-photo-portfolio-instagram-implementation.md
import { runImport } from './lib/instagram-sync.mjs'

const token = process.env.INSTAGRAM_ACCESS_TOKEN
if (!token) {
  console.error('INSTAGRAM_ACCESS_TOKEN is required')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

try {
  const report = await runImport({ token, dryRun })
  console.log(
    `import instagram → creati: ${report.created}, saltati: ${report.skipped}, ` +
    `non supportati: ${report.unsupported}, errori: ${report.errors}` +
    (dryRun ? ' (dry-run)' : '')
  )
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
