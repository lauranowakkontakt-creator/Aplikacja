# Mój Świat („Apka")

Osobista aplikacja PWA: budżet, nawyki, to-do, kalendarz, modlitwa, Biblia,
osoby, sen, wdzięcznik i wspomnik — w jednym miejscu, na telefonie.

React 18 + Vite + Firebase (Auth i Firestore). Hostowana na GitHub Pages.

---

## Szybki start

```bash
npm install
npm run dev        # http://localhost:5173
```

W trybie deweloperskim logowanie jest pominięte — apka wchodzi od razu jako
użytkownik `dev-user` (`DEV_MODE` w [`src/App.jsx`](src/App.jsx)). Dzięki temu
nie trzeba klikać przez Google przy każdym odświeżeniu.

## Polecenia

| Polecenie | Co robi |
|---|---|
| `npm run dev` | serwer deweloperski z hot reload |
| `npm test` | testy jednostkowe (`node --test`, bez dodatkowych bibliotek) |
| `npm run build` | build produkcyjny do `dist/` |
| `npm run check` | **testy + build.** To jest bramka przed pushem |
| `npm run preview` | podgląd zbudowanej wersji lokalnie |
| `npm run deploy` | `check` + publikacja na GitHub Pages |

## Wdrożenie

```bash
git pull --rebase      # zdalne repo bywa do przodu
npm run deploy
```

Dwie rzeczy, które regularnie mylą przy sprawdzaniu efektu:

- **Cache PWA.** Po wdrożeniu telefon potrafi jeszcze przez chwilę pokazywać
  starą wersję. Service worker ma `skipWaiting`, ale otwarta karta i tak musi
  zostać zamknięta i otwarta na nowo.
- **Reguły Firestore wdraża się osobno.** `npm run deploy` publikuje tylko
  aplikację. Po zmianie [`firestore.rules`](firestore.rules) trzeba dodatkowo:
  ```bash
  firebase deploy --only firestore:rules
  ```

Jest też [ręczny workflow](.github/workflows/deploy.yml) w zakładce Actions —
zapas na wypadek wygasnięcia klucza deployu.

---

## Struktura

```
src/
  App.jsx              przełączanie modułów, układ, górna belka
  firebase/config.js   inicjalizacja Firebase (patrz „Środowiska")
  components/
    Pulpit.jsx         ekran startowy — podsumowanie ze wszystkich modułów
    <modul>/           jeden katalog na moduł (budget, habits, prayer, …)
    …                  komponenty wspólne (Toast, ErrorBoundary, Icons…)
  utils/               CZYSTA LOGIKA — bez Reacta, bez Firebase
  styles/main.css      całość stylów
test/                  testy jednostkowe, jeden plik na moduł logiki
```

**Kluczowa zasada podziału:** w `src/utils/` mieszka logika, którą da się
przetestować bez przeglądarki i bez bazy — liczenie sald, serie nawyków,
sortowanie transakcji, parsowanie kwot. Komponenty odpowiadają za wyświetlanie
i za rozmowę z Firestore. Dlatego 300+ testów chodzi w ćwierć sekundy i nie
potrzebuje żadnego frameworka poza tym, co ma Node.

Dopisując logikę: jeśli da się ją policzyć z samych danych wejściowych, jej
miejsce jest w `utils/` razem z testem.

### Dane

Wszystko leży pod `users/{uid}/…` w Firestore — po jednej kolekcji na rodzaj
wpisu (`transactions`, `habits`, `prayerIntentions`, `dreams`, …).
Dostęp pilnują [reguły](firestore.rules): użytkownik widzi wyłącznie własne
poddrzewo, reszta bazy jest zamknięta.

Firestore działa z lokalnym cache w IndexedDB (`persistentLocalCache`), więc
apka pokazuje ostatnio pobrane dane także offline i startuje bez czekania
na sieć.

---

## Obsługa błędów

Trzy warstwy, każda na inny rodzaj awarii:

| Warstwa | Plik | Łapie |
|---|---|---|
| `bladSubskrypcji` | [`utils/polaczenie.js`](src/utils/polaczenie.js) | padnięte subskrypcje Firestore |
| `ErrorBoundary` | [`components/ErrorBoundary.jsx`](src/components/ErrorBoundary.jsx) | wyjątek w renderowaniu modułu |
| `log` | [`utils/logger.js`](src/utils/logger.js) | wszystko, co warto odnotować |

**Każde `onSnapshot` musi mieć `bladSubskrypcji` jako trzeci argument.**
Pilnuje tego test [`test/subskrypcje.test.js`](test/subskrypcje.test.js) — bez
tego padnięta subskrypcja jest całkowicie niema: Firestore po prostu przestaje
wołać callback, moduł zostaje na „Ładowanie…" bez końca i nic nie ląduje
w konsoli.

```js
onSnapshot(q, snap => {
  setRzeczy(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  setLoading(false)
}, bladSubskrypcji('rzeczy', { przyBledzie: () => setLoading(false) }))
```

`przyBledzie` służy do zgaszenia spinnera, żeby moduł pokazał pusty stan
zamiast wisieć. Reszta — log, rozróżnienie „brak sieci" od „awaria", zapalenie
paska u góry ekranu — dzieje się sama.

**Podgląd logów na telefonie:** Ustawienia → *Gdy coś nie działa* →
Diagnostyka. Widać tam ostatnie 200 zdarzeń z kodami błędów Firestore, z
przyciskiem kopiowania. Na telefonie nie ma konsoli, więc to jedyna droga,
żeby zobaczyć, co się naprawdę stało.

---

## Środowiska i sekrety

Klucze webowe Firebase **nie są sekretem** — trafiają do bundla, który każdy
może pobrać. Dlatego domyślna konfiguracja siedzi wprost
w [`src/firebase/config.js`](src/firebase/config.js) i apka działa zaraz po
`git clone`, bez żadnej konfiguracji. Danych pilnują reguły Firestore, nie
ukrywanie tych wartości.

Osobny projekt Firebase (żeby zabawa w devie nie mieszała w produkcyjnych
danych) podstawia się przez zmienne — wzór w [`.env.example`](.env.example):

```bash
cp .env.example .env.development.local   # i uzupełnij sześć wartości
```

Podać trzeba **komplet sześciu**; przy niepełnym zestawie kod świadomie wraca
do domyślnego projektu, bo wymieszanie połówek dwóch projektów daje błędy
uwierzytelniania, które bardzo trudno zdiagnozować. W konsoli deweloperskiej
widać przy starcie, do którego projektu apka pisze.

Pliki `.env.*.local` oraz klucz deployu `.deploy_key` są w `.gitignore`
i nigdy nie mają trafić do repo.

---

## Testy

```bash
npm test              # wszystkie
node --test test/budgetMath.test.js    # jeden plik
```

Testy jednostkowe pokrywają `src/utils/`. Oprócz nich są testy strukturalne,
które pilnują całości aplikacji:

- [`appStructure.test.js`](test/appStructure.test.js) — nowy moduł jest podpięty
  wszędzie tam, gdzie trzeba (a jest tych miejsc pięć)
- [`subskrypcje.test.js`](test/subskrypcje.test.js) — każde `onSnapshot` ma obsługę błędu
- [`mobile-compat.test.js`](test/mobile-compat.test.js) — safe-area, `dvh`,
  prefiksy `-webkit-`, cele dotykowe, brak poziomego wychodzenia poza ekran
- [`no-emoji.test.js`](test/no-emoji.test.js) — ikony jako SVG, nie emoji

Do tego [lista testów ręcznych](docs/testy-reczne.md) — rzeczy, których nie da
się sprawdzić bez telefonu w ręku.

**Zasada:** każda nowa lub zmieniona logika dostaje test, a `npm run check`
przechodzi przed pushem. To samo sprawdza [CI](.github/workflows/ci.yml) przy
każdym pushu.

## Zależności

Stan, otwarte luki i kolejność przyszłych aktualizacji major:
[`docs/zaleznosci.md`](docs/zaleznosci.md).
