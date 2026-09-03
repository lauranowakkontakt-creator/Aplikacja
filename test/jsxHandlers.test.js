import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Widok „Dziś" w Modlitwie wywalał cały moduł, bo podawał karcie handler
// `toggleChecklistItem` zadeklarowany w sąsiednim komponencie. W JSX to zwykła
// nazwa, więc ani build, ani testy logiki tego nie łapały — dopiero wejście
// w zakładkę dawało ReferenceError i pusty ekran.
//
// Ten test chodzi po komponentach i sprawdza, że każdy handler podany jako
// `onCoś={nazwa}` jest w tym komponencie widoczny: zadeklarowany lokalnie,
// wzięty z propsów albo z góry pliku (import / stała modułu). Zasięg liczymy
// hojnie — lepiej przepuścić wątpliwy przypadek niż oskarżyć zdrowy kod.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const IDENT = /[A-Za-z_$][\w$]*/g

function jsxFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...jsxFiles(full))
    else if (name.endsWith('.jsx')) out.push(full)
  }
  return out
}

const names = (src, re) => [...src.matchAll(re)].map(m => m[1])
const addAll = (set, text) => { for (const n of text.match(IDENT) || []) set.add(n) }

// Zawartość nawiasu/klamry otwartej na pozycji `at`, z domknięciem po parze.
function balanced(src, at) {
  const close = { '(': ')', '[': ']', '{': '}' }[src[at]]
  let depth = 0
  for (let i = at; i < src.length; i++) {
    if (src[i] === src[at]) depth++
    else if (src[i] === close && !--depth) return src.slice(at + 1, i)
  }
  return ''
}

// Zasięg modułu: importy oraz deklaracje na pierwszej kolumnie.
function moduleScope(src) {
  const s = new Set()
  for (const m of src.matchAll(/^import\s+([\s\S]*?)\s+from\s+/gm)) addAll(s, m[1])
  for (const n of names(src, /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) s.add(n)
  for (const n of names(src, /^(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) s.add(n)
  return s
}

// Komponenty najwyższego poziomu: od `function Nazwa(` na pierwszej kolumnie
// do zamykającego `}` również na pierwszej kolumnie.
function topLevelBlocks(src) {
  const lines = src.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const start = /^(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(lines[i])
    if (!start) continue
    let end = lines.length - 1
    for (let j = i + 1; j < lines.length; j++) if (lines[j] === '}') { end = j; break }
    blocks.push({ name: start[1], body: lines.slice(i, end + 1).join('\n') })
    i = end
  }
  return blocks
}

// Wszystko, co wchodzi do zasięgu bloku: propsy, deklaracje (w tym `const [x, setX]`
// z useState), rozpakowania i parametry strzałek.
function localScope(body) {
  const s = new Set()
  addAll(s, balanced(body, body.indexOf('(')))
  for (const n of names(body, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) s.add(n)
  for (const n of names(body, /\bfunction\s+([A-Za-z_$][\w$]*)/g)) s.add(n)
  for (const m of body.matchAll(/\b(?:const|let|var)\s*(?=[{[])/g)) {
    addAll(s, balanced(body, m.index + m[0].length))
  }
  for (const m of body.matchAll(/=>/g)) {
    let i = m.index - 1
    while (i >= 0 && /\s/.test(body[i])) i--
    if (body[i] !== ')') {
      let j = i
      while (j >= 0 && /[\w$]/.test(body[j])) j--
      s.add(body.slice(j + 1, i + 1))
      continue
    }
    let depth = 0, j = i
    for (; j >= 0; j--) {
      if (body[j] === ')') depth++
      else if (body[j] === '(' && !--depth) break
    }
    addAll(s, body.slice(j + 1, i))
  }
  return s
}

const files = jsxFiles(SRC)

test('JSX: handlery podawane w propsach istnieją w zasięgu komponentu', () => {
  assert.ok(files.length > 10, 'nie znaleziono komponentów do sprawdzenia')
  const problems = []
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const outer = moduleScope(src)
    for (const block of topLevelBlocks(src)) {
      const scope = localScope(block.body)
      for (const m of block.body.matchAll(/\bon[A-Z][\w$]*=\{([A-Za-z_$][\w$]*)\}/g)) {
        if (scope.has(m[1]) || outer.has(m[1])) continue
        problems.push(`${relative(ROOT, file)} → ${block.name}(): on…={${m[1]}} — nazwa nieznana w tym zasięgu`)
      }
    }
  }
  assert.deepEqual(problems, [], `handlery bez deklaracji:\n${problems.join('\n')}`)
})

test('Modlitwa: widok „Dziś" potrafi odhaczać punkty listy', () => {
  // Pierwotnie ten test szukał LOKALNEJ kopii toggleChecklistItem wewnątrz
  // TodayView w PrayerDashboard.jsx. Po rozbiciu modułu na pliki TodayView
  // mieszka osobno i bierze jedną wspólną implementację z wspolne.jsx —
  // czyli intencja jest spełniona, tylko bez duplikatu.
  //
  // Sprawdzamy więc to, o co naprawdę chodziło: że „Dziś" ma tę funkcję
  // W ZASIĘGU i faktycznie podaje ją karcie prośby. Gdzie jest zadeklarowana
  // i czy jest jedna czy dwie — to już decyzja o strukturze, nie o poprawności.
  const today = jsxFiles(SRC).find(f => f.endsWith('prayer/TodayView.jsx'))
    || join(SRC, 'components/prayer/PrayerDashboard.jsx')
  const src = readFileSync(today, 'utf8')

  assert.match(src, /toggleChecklistItem/, 'widok „Dziś" nie zna odhaczania punktów')
  assert.match(src, /onToggleChecklistItem=/, 'widok „Dziś" nie podaje odhaczania karcie prośby')

  // Sama implementacja — gdziekolwiek jest — musi zapisywać stan punktów.
  const gdzie = src.includes('const toggleChecklistItem = async')
    ? src
    : readFileSync(join(SRC, 'components/prayer/wspolne.jsx'), 'utf8')
  assert.match(gdzie, /checklistDone: toggleChecked\(/)
})
