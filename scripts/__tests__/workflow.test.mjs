import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Instagram workflow is scheduled, manually runnable, and never prints the token', async () => {
  const workflow = await readFile('.github/workflows/sync-instagram.yml', 'utf8')
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /INSTAGRAM_ACCESS_TOKEN/)
  assert.doesNotMatch(workflow, /echo\s+\$\{\{\s*secrets\.INSTAGRAM_ACCESS_TOKEN/i)
})
