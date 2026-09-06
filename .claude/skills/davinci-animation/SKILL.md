---
name: davinci-animation
description: Tworzenie animacji i motion graphics — programistycznie w Remotion (React/TSX) albo bezpośrednio w DaVinci Resolve przez MCP (Fusion, keyframe'y, tytuły, przejścia, szablony .setting, grading, render). Używaj, gdy zadanie dotyczy animacji, motion graphics, tytułu, dolnego paska, przejścia, keyframe'ów, easingu, kompozycji Fusion, node graphu, timeline'u Resolve, importu mediów, gradingu, kolejki renderu, plików .setting/.drp/.drt/.drx, DCTL, albo renderowania wideo z kodu (Remotion, interpolate, spring, Composition). Uruchamiaj też przy słowach: "animacja", "rolka", "napisy", "intro", "outro", "template do Resolve", "wyrenderuj wideo", "davinci", "fusion", "remotion".
---

# DaVinci Animation

Jeden warsztat do robienia ruchomego obrazu. Dwa silniki, jedna dyscyplina:

| Silnik | Czym jest | Kiedy go bierzesz |
|---|---|---|
| **Remotion** | wideo jako komponenty React, renderowane klatka po klatce | animacja generowana z danych, dziesiątki wariantów, tekst/SVG/HTML, render w CI, pełna kontrola w kodzie |
| **DaVinci Resolve przez MCP** | sterowanie żywą sesją Resolve (Fusion, Edit, Color, Deliver) | materiał filmowy, grading, conform, dostawa, projekt klienta, praca na istniejącym timelinie |
| **Szablony `.setting`** | skompilowana kompozycja Fusion na dysku | rzecz wielokrotnego użytku, którą montażysta przeciąga na klip: tytuł, przejście, efekt, generator |
| **Serwer offline (`.drp`/`.drt`/`.drx`)** | edycja plików projektu bez uruchomionego Resolve | matematyka conformu, batch, QC, generowanie grade'ów |

Nie wybieraj silnika z przyzwyczajenia. Wybierz z **tabeli decyzyjnej** niżej, potem czytaj tylko ten plik referencyjny, który jest potrzebny.

---

## Tabela decyzyjna

| Zadanie | Silnik | Referencja |
|---|---|---|
| „Zrób animowane intro / rolkę / wykres z danych" | Remotion | `references/remotion.md` |
| „50 wariantów tego samego klipu z innym tekstem" | Remotion (`calculateMetadata`, props) | `references/remotion.md` |
| „Dodaj tytuł / dolny pasek na klip 3 na timelinie" | Resolve MCP → Fusion comp | `references/resolve-mcp.md`, `references/fusion-graph.md` |
| „Animuj pozycję/skalę klipu na timelinie" | Resolve MCP → `timeline_item` keyframes | `references/resolve-mcp.md` |
| „Zrób szablon tytułu, który sam sobie ustawię w Resolve" | plik `.setting` | `references/setting-templates.md` |
| „Zrób przejście (transition)" | plik `.setting` z `LUTLookup` | `references/setting-templates.md` |
| „Wyrenderuj i dostarcz" | Resolve MCP → `render` | `references/pipeline.md` |
| „Wsadź moją animację z kodu do montażu" | Remotion → render → import do Resolve | `references/pipeline.md` |
| „Popraw grade / node graph / LUT" | Resolve MCP → `timeline_item_color` | `references/resolve-mcp.md` |

---

## Siedem zasad, które obowiązują wszędzie

Te reguły powtarzają się w każdym źródle w innym przebraniu. Zapamiętaj raz, stosuj w obu silnikach.

**1. Klatka jest zegarem.** Każda wartość animowana jest funkcją numeru klatki — nigdy czasu ściennego, nigdy `Date.now()`, nigdy `setTimeout`. W Remotion to `useCurrentFrame()`. W Fusion to `time` albo rampa z `LUTLookup`. Renderer może liczyć klatkę 300 przed klatką 12; wszystko, co pamięta stan między klatkami, rozjedzie się.

**2. Determinizm albo nic.** Ta sama klatka + te same propsy = ten sam piksel. Żadnego `Math.random()` (w Remotion jest `random(seed)`), żadnych zapytań sieciowych w trakcie renderu, żadnych mutowalnych modułowych zmiennych.

**3. Dowodem jest wyrenderowana klatka, nie odczyt parametru.** To najdroższa lekcja z Resolve: wartość zapisana w graf Fusion potrafi wrócić poprawnie z `get_input`, a render i tak ją zignoruje (potwierdzone bit-identycznym PSNR wobec baseline'u bez kompozycji). Ta sama zasada w Remotion: `npx remotion still` zanim ogłosisz, że animacja działa. Nigdy nie raportuj „gotowe" na podstawie odczytu stanu.

**4. Kontekst determinuje, czy wywołanie w ogóle zadziała.** W Resolve to strona aplikacji (Color / Fusion / Edit / Fairlight / Deliver) — nieoczekiwane `False` najczęściej znaczy „zła strona", nie „błąd". W Remotion to `<Composition>` i `<Sequence>` — poza nimi `useCurrentFrame()` zwraca coś innego, niż myślisz.

**5. Indeksy się nie zgadzają celowo.** W Resolve `track_index` liczy się od **1**, `item_index` od **0**. Pomyłka tutaj to najczęstszy „nie ma takiego klipu".

**6. Materiał źródłowy jest nietykalny.** Nie transkoduj, nie rób proxy, nie nadpisuj oryginałów, jeśli użytkownik wprost o to nie poprosił. Analizy zapisuj obok, jako sidecary.

**7. Czytaj kopertę operacji.** Każdy wynik z serwera MCP niesie blok `_operation`. `verification.status = "contradiction"` to jedyny status, na którym zatrzymujesz się natychmiast. `unverified` znaczy „nikt nie sprawdził", a nie „sprawdzone i czyste". Brak `changes` znaczy „nie zaraportowano", a nie „nic się nie zmieniło". Szczegóły: `references/resolve-mcp.md`.

---

## Wspólny słownik czasu

Ta sama idea, dwie składnie. Trzymaj to w głowie przy przenoszeniu animacji między silnikami.

| Pojęcie | Remotion | Fusion / Resolve |
|---|---|---|
| bieżąca klatka | `useCurrentFrame()` | zmienna `time` w wyrażeniu Lua |
| długość | `durationInFrames` z `useVideoConfig()` | długość klipu / `GlobalOut` na węźle |
| rampa 0→1 przez całość | `interpolate(frame, [0, d], [0, 1])` | goły `LUTLookup {}` (sam bierze `Duration`) |
| easing | `spring()`, `Easing.bezier(...)` | `LUTLookup` z `Curve = FuID{"Easing"}` + `LUTBezier`, albo uchwyty `LH`/`RH` w `BezierSpline` |
| keyframe'y w bezwzględnych klatkach | `interpolate` z tablicą punktów | `BezierSpline { KeyFrames = { [13] = {0}, ... } }` |
| rozciągnięcie animacji do długości klipu | `durationInFrames` jest znane z góry | `KeyStretcher` (bez niego tytuł zamarza — patrz `setting-templates.md`) |
| przesunięcie w czasie | `<Sequence from={30}>` | `Offset` na `LUTLookup`, `TimeCurve` na `LUTBezier` |
| pauza / zatrzymanie | `<Freeze frame={n}>` | `Flags = { Linear = true }` na płaskim odcinku splajnu |

Uwaga na pułapkę: `BezierSpline` operuje **bezwzględnymi numerami klatek**, a `LUTBezier` **znormalizowanym 0.0–1.0**. Pomylenie ich to klasyczny „animacja gra w złym tempie albo zamarza".

---

## Procedura robocza

1. **Ustal specyfikację przed pierwszą linijką kodu.** fps, rozdzielczość, długość w klatkach, format docelowy. Bez tego liczby w easingu nic nie znaczą.
2. **Wybierz silnik z tabeli decyzyjnej.** Jeśli zadanie ma dwie połowy (animacja + montaż), zaplanuj punkt styku od razu — patrz `references/pipeline.md`.
3. **Zbuduj najmniejszą działającą wersję.** Jedna kompozycja / jeden węzeł. Nie buduj dziesięciu warstw przed pierwszym renderem.
4. **Zweryfikuj pikselem.** Remotion: `npx remotion still <id> out.png --frame=N`. Resolve: `timeline_frame(action="capture")` albo `gallery_stills(action="grab_and_export")`.
5. **Dopiero potem rozbudowuj.** I weryfikuj po każdym kroku, który dotyka Fusion — tam readback nie jest dowodem.
6. **Dostarcz.** Render z jawnie ustawionym formatem i kodekiem, nie z domyślnym presetem.

---

## Referencje

Czytaj to, czego potrzebujesz — nie wszystko naraz.

| Plik | Co zawiera |
|---|---|
| `references/remotion.md` | Kompozycje, `interpolate`, `spring`, `Sequence`, komponenty mediów, reguły komponentu Remotion vs React, render z CLI, parametryzacja |
| `references/resolve-mcp.md` | Połączenie i tryby serwera, koperta `_operation`, wymagania stron, mapa narzędzi, keyframe'y na klipie, obsługa błędów, gotchas |
| `references/fusion-graph.md` | Budowa i animacja grafu Fusion przez MCP, bezpieczne wrappery, kolejność operacji, weryfikacja renderem |
| `references/setting-templates.md` | Format `.setting`, `GroupOperator`, `InstanceInput`, `BezierSpline`, `LUTLookup`/`LUTBezier`, `KeyStretcher`, ścieżki instalacji, 12 pułapek |
| `references/pipeline.md` | Przepływy end-to-end: Remotion → Resolve, import mediów, budowa timeline'u, grading, render, dostawa |
| `assets/RemotionStarter.tsx` | Gotowy szkielet kompozycji z poprawnym timingiem |
| `assets/TitleTemplate.setting` | Gotowy szablon animowanego tytułu z `KeyStretcher` |

---

## Czego nie robić

- Nie mieszaj interaktywnego Reacta z Remotion. `onClick`, `useEffect` z timerem, `window.addEventListener` — w renderze nie istnieją. Komponent Remotion jest czystą funkcją klatki.
- Nie zgaduj nazw enumów `FuID`. Zły string ładuje się bez błędu i cicho wraca do domyślnej wartości. Podejrzyj działający plik.
- Nie szukaj parametru „Progress" w przejściu Fusion. Nie ma go. Rampa jest darmowa i automatyczna z `LUTLookup`.
- Nie wrzucaj `.setting` luzem do `Templates/Edit/`. Bez podkatalogu kategorii plik znika ze strony Edit i pojawia się w bibliotece Fusion — wygląda to na sukces, a nim nie jest.
- Nie ogłaszaj gotowego efektu Fusion na podstawie `get_input`. Patrz zasada 3.
