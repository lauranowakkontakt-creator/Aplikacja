import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

// Emotki (piktogramy). UWAGA: NIE obejmuje strzałek (→ ← ↑ ↓ ↵, blok 2190–21FF),
// które są świadomie używane w interfejsie.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2705}\u{2728}\u{274C}\u{2764}]/u

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(jsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

test('brak emotek w kodzie źródłowym (src/)', () => {
  const offenders = []
  for (const file of walk(SRC)) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(EMOJI)
      if (m) offenders.push(`${file.replace(SRC, 'src')}:${i + 1}  ${m[0]}  | ${line.trim().slice(0, 70)}`)
    })
  }
  assert.equal(offenders.length, 0, 'Znaleziono emotki:\n' + offenders.join('\n'))
})
