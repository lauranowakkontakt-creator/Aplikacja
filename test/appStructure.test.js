import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Testy spójności aplikacji jako całości: czy nowy moduł jest podpięty wszędzie
// tam, gdzie trzeba, czy nazwa się zgadza i czy usunięte rzeczy naprawdę znikły.
// Wcześniej dodanie modułu wymagało pamiętania o pięciu miejscach naraz.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// Wszystkie pliki źródłowe — do testów pilnujących, że czegoś NIE MA nigdzie
// w kodzie (np. drugiej kopii wspólnego komponentu).
function zrodlaSrc(katalog = join(ROOT, 'src')) {
  const wynik = []
  for (const nazwa of readdirSync(katalog)) {
    const p = join(katalog, nazwa)
    if (statSync(p).isDirectory()) wynik.push(...zrodlaSrc(p))
    else if (/\.jsx?$/.test(nazwa)) wynik.push(p)
  }
  return wynik
}

// Skleja wszystkie pliki modułu w jeden tekst. Testy strukturalne mają pilnować
// tego, CZY coś w module jest — nie tego, w którym dokładnie pliku, bo inaczej
// każdy podział dużego komponentu wywala je bez żadnej realnej regresji.
const readModule = (katalog) => readdirSync(join(ROOT, katalog))
  .filter(f => f.endsWith('.jsx') || f.endsWith('.js'))
  .map(f => read(join(katalog, f)))
  .join('\n')

const APP    = read('src/App.jsx')
const PULPIT = read('src/components/Pulpit.jsx')
const HTML   = read('index.html')
const VITE   = read('vite.config.js')

// Id modułów z buildModules() w App.jsx
const moduleIds = [...APP.matchAll(/\{\s*id:\s*'([a-z]+)'\s*,\s*label:/g)].map(m => m[1])

test('App: buildModules zwiera komplet modułów, w tym nowe', () => {
  for (const id of ['home', 'budget', 'habits', 'calendar', 'gratitude', 'memories']) {
    assert.ok(moduleIds.includes(id), `brak modułu ${id} w buildModules`)
  }
  assert.equal(new Set(moduleIds).size, moduleIds.length, 'zdublowane id modułu')
})

test('App: każdy moduł ma kolor akcentu', () => {
  const accents = APP.match(/const MODULE_ACCENTS = \{[\s\S]*?\n\}/)?.[0] || ''
  for (const id of moduleIds) {
    assert.match(accents, new RegExp(`${id}\\s*:`), `moduł ${id} nie ma koloru w MODULE_ACCENTS`)
  }
})

test('App: każdy moduł poza Pulpitem ma leniwy import i jest renderowany', () => {
  for (const id of moduleIds) {
    if (id === 'home') continue
    assert.match(APP, new RegExp(`activeModule === '${id}'`), `moduł ${id} nie jest renderowany`)
  }
  // Nowe moduły dokładamy jako osobne chunki — inaczej rosłoby wejście na telefonie.
  assert.match(APP, /lazy\(\(\) => import\('\.\/components\/gratitude\/GratitudeDashboard'\)\)/)
  assert.match(APP, /lazy\(\(\) => import\('\.\/components\/memories\/MemoriesDashboard'\)\)/)
})

test('App: kolejność i ukrywanie modułów idzie przez moduleLayout', () => {
  assert.match(APP, /from '\.\/utils\/moduleLayout'/)
  assert.match(APP, /navModules\(modules\)/)
  // Stała lista modułów na pasku zniknęła — decyduje układ użytkownika.
  assert.ok(!APP.includes('PRIMARY_NAV'), 'PRIMARY_NAV powinno zniknąć na rzecz układu użytkownika')
})

test('App: ukrycie aktywnego modułu cofa na Pulpit', () => {
  // Bez tego użytkownik zostaje w widoku, do którego nie ma już jak wrócić.
  assert.match(APP, /m\.hidden\)\) setActiveModule\('home'\)/)
})

test('Pulpit: pokazuje tylko moduły zostawione przez użytkownika', () => {
  assert.match(PULPIT, /visibleIds/)
  const cards = (PULPIT.match(/<PulpitCard/g) || []).length
  const guards = (PULPIT.match(/\{shows\('/g) || []).length
  assert.equal(guards, cards, 'każda karta Pulpitu musi być pod warunkiem shows()')
  assert.ok(cards >= 6, `spodziewano się co najmniej 6 kart, jest ${cards}`)
})

test('Pulpit: agenda pomija pozycje z ukrytych modułów', () => {
  assert.match(PULPIT, /items\.filter\(it => shows\(it\.module\)\)/)
})

test('Nazwa aplikacji to Apka — wszędzie', () => {
  assert.match(HTML, /<title>Apka<\/title>/)
  assert.match(HTML, /content="Apka"/)
  assert.match(VITE, /name: 'Apka'/)
  assert.match(VITE, /short_name: 'Apka'/)
  const stale = walk(join(ROOT, 'src'))
    .filter(f => read(f.replace(ROOT + '/', '')).includes('Mój Świat'))
  assert.deepEqual(stale, [], 'gdzieś została stara nazwa')
})

test('Wdzięcznik i Wspomnik nie mają czarnej belki .mod-header', () => {
  // .mod-header ma nieprzezroczyste tło i psuł szklany nagłówek w tych modułach.
  for (const f of ['src/components/gratitude/GratitudeDashboard.jsx',
                   'src/components/memories/MemoriesDashboard.jsx']) {
    assert.ok(!read(f).includes('mod-header'), `${f} nadal używa .mod-header`)
  }
})

test('Dziesięcina: nie ma już osobnej ofiary', () => {
  const cats  = read('src/utils/categories.js')
  const tithe = read('src/components/budget/TitheView.jsx')
  assert.ok(!cats.includes("id: 'ofiara'"), 'kategoria „ofiara" nadal na liście wyboru')
  assert.ok(!/ofiara/i.test(tithe), 'widok dziesięciny nadal wspomina ofiarę')
})

test('Dziesięcina: procent od użytkownika, podstawa z zaznaczonych przychodów', () => {
  const tithe = read('src/components/budget/TitheView.jsx')
  const form  = read('src/components/TransactionForm.jsx')
  assert.ok(!tithe.includes('* 0.10'), 'procent nie może być zaszyty na sztywno')
  assert.match(tithe, /settings\.percent/)
  // Zaznaczenie przy przychodzie + rozliczanie puli po wpłacie
  assert.match(form, /tithe: type === 'income' \? tithe : false/)
  assert.match(tithe, /titheSettledAt/)
})

test('Kalendarz: klik w dzień pokazuje, co się dzieje', () => {
  const cal = readModule('src/components/calendar')
  assert.match(cal, /<DayDetail/)
  assert.match(cal, /function DayDetail\(/)
  // Pusty dzień podpowiada najbliższe wydarzenia zamiast pokazywać nic.
  assert.match(cal, /upcomingEvents\(/)
})

test('Nawyki: dzień zrobiony mimo wyjazdu ma własne oznaczenie', () => {
  const logic = read('src/utils/habitLogic.js')
  assert.match(logic, /'done-paused'/)
  for (const f of ['src/components/habits/HabitDayGrid.jsx',
                   'src/components/habits/HabitsDashboard.jsx']) {
    assert.match(read(f), /done-paused/, `${f} nie wyróżnia dnia z przerwy`)
  }
})

test('Nastrój nie jest osobną apką — mieszka w Nawykach', () => {
  assert.ok(!moduleIds.includes('mood'), 'Nastrój nadal jest osobnym modułem')
  assert.ok(!APP.includes('MoodDashboard'), 'App nadal renderuje Nastrój jako moduł')
  const habits = read('src/components/habits/HabitsDashboard.jsx')
  assert.match(habits, /import\('\.\.\/mood\/MoodDashboard'\)/, 'Nawyki nie ładują Nastroju')
  // Wejście do Nastroju to mała twarz w belce — bez podpisu i bez kafelka.
  assert.match(habits, /hdr-mood/, 'brak ikonki nastroju w belce Nawyków')
  assert.ok(!/mood-tile/.test(habits), 'kafelek nastroju powinien zniknąć')
  assert.ok(!/jak się dziś masz/.test(habits), 'ikonka nastroju nie ma mieć podpisu')
  // Jedna belka na oba widoki: Nastrój wstrzyka swoje akcje do tej samej
  // belki co Nawyki. Osobny pasek arkusza chowal sie pod belka aplikacji
  // i nie dalo sie wyjsc z Nastroju.
  assert.match(habits, /setHeaderExtras=\{setMoodExtras\}/)
  assert.ok(!/mood-sheet/.test(habits), 'Nastrój nie może wracać jako osobny arkusz')
  assert.match(habits, /if \(moodOpen\) \{/, 'Nastrój ma się renderować w miejscu treści Nawyków')
  assert.match(habits, /setMoodOpen\(o => !o\)/, 'twarz musi przełączać w obie strony')
})

test('Nowe kolekcje wchodzą do kopii danych', () => {
  const exp = read('src/utils/dataExport.js')
  for (const col of ['gratitude', 'memories']) {
    assert.match(exp, new RegExp(`'${col}'`), `kolekcja ${col} nie jest eksportowana`)
  }
})

test('Wdzięczność i wspomnienia bez serii i rekordów — to nie wyścig', () => {
  const logic  = read('src/utils/gratitudeLogic.js')
  const grat   = read('src/components/gratitude/GratitudeDashboard.jsx')
  const mem    = read('src/components/memories/MemoriesDashboard.jsx')
  assert.ok(!/streak/i.test(logic), 'logika wdzięczności nadal liczy serie')
  for (const [name, src] of [['Wdzięcznik', grat], ['Wspomnik', mem]]) {
    assert.ok(!/Seria|Rekord/.test(src), `${name} nadal pokazuje serię lub rekord`)
  }
  assert.ok(!/gratStat\.streak/.test(PULPIT), 'Pulpit nadal pokazuje serię wdzięczności')
})

test('Wdzięcznik i Wspomnik: przypominajka i przeglądanie wpisów', () => {
  for (const f of ['src/components/gratitude/GratitudeDashboard.jsx',
                   'src/components/memories/MemoriesDashboard.jsx']) {
    const src = read(f)
    assert.match(src, /pickBySeed/, `${f}: brak losowej przypominajki`)
    assert.match(src, /recall-card/, `${f}: brak karty przypominajki`)
    assert.match(src, /neighbors\(/, `${f}: brak skakania między wpisami`)
    assert.match(src, /reader-nav/, `${f}: brak strzałek w podglądzie`)
  }
})

test('Biblia: reset i licznik pod trzema kropkami, start sam się włącza', () => {
  const bible = read('src/components/bible/BibleDashboard.jsx')
  assert.match(bible, /<BibleMenu/, 'brak menu ⋮ w Biblii')
  assert.match(bible, /resetProgress/, 'brak resetu postępów')
  // Licznik nie może już siedzieć na głównym ekranie — tylko w oknie z menu.
  assert.match(bible, /showJourney/)
  // Start ustawia się po odhaczeniu pierwszego rozdziału, bez żadnego przycisku.
  assert.match(bible, /stats\.read > 0 && !progress\.startDate/)
  assert.match(APP, /activeModule === 'bible'.*setHeaderExtras/)
})

test('Biblia: reset naprawdę kasuje rozdziały (nie merge pustą mapą)', () => {
  // setDoc({ counts: {} }, { merge: true }) SCALA mapy — nie skasowałoby
  // odhaczonych rozdziałów, a reset i tak pokazałby sukces.
  const bible = read('src/components/bible/BibleDashboard.jsx')
  const reset = bible.slice(bible.indexOf('const resetProgress'), bible.indexOf('// Górna belka'))
  assert.match(reset, /updateDoc\(ref, \{ counts: \{\}/, 'reset musi używać updateDoc')
  assert.ok(!/setDoc\(ref, \{ counts: \{\}[^)]*merge: true/.test(reset),
    'reset nadal kasuje rozdziały przez merge — to nic nie robi')
})

test('Dziesięcina: niedopłata nie znika razem z pulą', () => {
  const tithe = read('src/components/budget/TitheView.jsx')
  assert.match(tithe, /nextCarryOver\(due, paid\)/, 'brak przeniesienia reszty na następne rozliczenie')
  assert.match(tithe, /titheTotalDue\(/, 'kwota do oddania musi uwzględniać zaległość')
  // Rozliczone przychody muszą wypaść z zapytania, inaczej rośnie ono bez końca.
  assert.match(tithe, /tithe: false, titheSettledAt/)
})

test('Modlitwa: opis albo lista do odhaczania', () => {
  // Czytamy CAŁY moduł, nie pojedynczy plik: widoki Modlitwy siedzą w osobnych
  // plikach obok PrayerDashboard.jsx i przy kolejnym podziale test nie ma
  // padać tylko dlatego, że kod przeniósł się o plik dalej. Sprawdzamy, że
  // funkcja jest w module — nie gdzie dokładnie.
  const pray = readModule('src/components/prayer')
  assert.match(pray, /note-mode-btn/, 'brak przełącznika Opis / Lista')
  assert.match(pray, /function PrayerChecklist\(/, 'brak listy przy prośbie')
  // Odhaczanie punkt po punkcie zapisuje sie od razu.
  assert.match(pray, /checklistDone: toggleChecked/)
})

test('Modlitwa: odhaczanie dostępne w obu widokach, które go używają', () => {
  // Regresja: toggleChecklistItem było zamknięte w PersonDetailView, a widok
  // „Dziś" i tak podawał tę nazwę do RequestCard — czyli sięgał po zmienną
  // spoza swojego zakresu i wywalał się ReferenceError-em przy każdej liście
  // próśb. Funkcja musi być wspólna, nie lokalna dla jednego widoku.
  const wspolne = read('src/components/prayer/wspolne.jsx')
  assert.match(wspolne, /export async function toggleChecklistItem\(uid,/,
    'toggleChecklistItem musi być wspólne i brać uid, nie domykać się nad jednym widokiem')

  for (const plik of ['TodayView.jsx', 'PersonDetailView.jsx']) {
    const kod = read(`src/components/prayer/${plik}`)
    assert.match(kod, /toggleChecklistItem/, `${plik} nie podaje odhaczania do karty prośby`)
    assert.match(kod, /from '\.\/wspolne'/, `${plik} musi importować je z wspolne.jsx`)
  }
})

test('Nawyki: cel z wymaganych, licznik ze wszystkiego zrobionego', () => {
  const logic  = read('src/utils/habitLogic.js')
  const habits = read('src/components/habits/HabitsDashboard.jsx')
  const form   = read('src/components/habits/HabitForm.jsx')
  assert.match(logic, /export function dayScore/)
  assert.match(form, /setOptional/, 'brak wyboru wymagany / dodatkowy')
  // Pulpit i modul licza tak samo — jedna funkcja, nie dwie kopie.
  assert.match(habits, /dayScore\(filtered, TODAY, pauses\)/)
  assert.match(PULPIT, /dayScore\(habits, today, pauses\)/)
  assert.ok(!/function isDueOn/.test(PULPIT), 'Pulpit nie moze miec wlasnej kopii logiki nawykow')
})

test('Pulpit: pierscienie nie najezdzaja na tekst', () => {
  // Ring stoi w kontenerze flex obok napisow — bez flexShrink zapadal sie
  // ponizej swojego rozmiaru, a SVG wychodzilo poza pudelko.
  const chart = read('src/components/ChartPrimitives.jsx')
  assert.match(chart, /width: size, height: size, flexShrink: 0/)
})

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(jsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

test('Osoba wygląda tak samo we wszystkich modułach', () => {
  // „Bąbelek" osoby był skopiowany CZTERY razy — w Kalendarzu, Śnie, Osobach
  // i jako wspólny komponent — a kopie zdążyły się rozjechać: część nie
  // pokazywała ikony osoby, część miała inny rozmiar czcionki. Osoba jest
  // współdzielona między modułami (jedna kolekcja `calendarPeople`), więc
  // ma jedną reprezentację.
  const wlasneKopie = []
  for (const plik of zrodlaSrc()) {
    if (plik.endsWith('components/PersonBubble.jsx')) continue
    const kod = readFileSync(plik, 'utf8')
    if (/function (Bubble|PersonBubble)\s*\(/.test(kod)) {
      wlasneKopie.push(plik.replace(ROOT + '/', ''))
    }
  }
  assert.deepEqual(wlasneKopie, [], 'własne kopie bąbelka osoby zamiast components/PersonBubble')
})

test('Paleta kolorów osób ma jedno źródło', () => {
  // Ta sama lista siedziała w trzech plikach; dorzucenie koloru w jednym
  // dawało osobę wyglądającą inaczej w innym module.
  const wlasneKopie = []
  for (const plik of zrodlaSrc()) {
    if (plik.endsWith('utils/personColors.js')) continue
    const kod = readFileSync(plik, 'utf8')
    if (/const PERSON_COLORS\s*=\s*\[/.test(kod)) wlasneKopie.push(plik.replace(ROOT + '/', ''))
  }
  assert.deepEqual(wlasneKopie, [], 'własne kopie palety zamiast utils/personColors.js')
})
