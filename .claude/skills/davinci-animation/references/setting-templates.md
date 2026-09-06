# Szablony `.setting` — animacja, którą montażysta przeciąga na klip

Plik `.setting` to **kompozycja Fusion zserializowana jako tabela Lua**. Zwykły,
edytowalny tekst. Żadnego SDK, żadnej kompilacji, żadnego podpisywania kodu —
plik tekstowy plus kilka PNG-ów obok.

---

## 1. Pięć ról i gdzie je instalować

| Rola | Katalog | MainInputs | MainOutput | Węzeł szczytowy |
|---|---|---|---|---|
| **Edit Effect** (filtr klipu) | `Templates/Edit/Effects/` | `MainInput1` → klip | `MainOutput1` | GroupOperator |
| **Edit Transition** | `Templates/Edit/Transitions/` | `MainInput1` (tło) + `MainInput2` (przód) | `MainOutput1` | GroupOperator |
| **Edit Title** | `Templates/Edit/Titles/` | brak — generuje | `MainOutput1` | GroupOperator na `TextPlus` |
| **Edit Generator** | `Templates/Edit/Generators/` | brak — generuje | `MainOutput1` | GroupOperator lub goły węzeł |
| **Fusion Macro** | `Templates/Fusion/<Tools\|Backgrounds\|Generators\|Particles\|Shaders\|Styled Text\|Motion Graphics\|Lens Flares\|How To>/` | opcjonalne | opcjonalne | GroupOperator albo gołe węzły |

**Ścieżki użytkownika:**
- Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Templates\<rola>\<kategoria>\`
- macOS (user): `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Templates/<rola>/<kategoria>/`
- macOS (system): `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Templates/<rola>/<kategoria>/`

**Podkatalog kategorii nie jest opcjonalny.** Plik w `Templates/Edit/MyEffect.setting`
(luzem, bez kategorii) jest **niewidoczny dla strony Edit** — biblioteka Fusion
indeksuje go mimo to, więc wygląda na zainstalowany, tylko w złym miejscu.
Zawsze pełna ścieżka: `Templates/Edit/Effects/MyEffect.setting`.

**Resolve indeksuje szablony przy starcie — po wrzuceniu plików restart.**

`Fusion/Looks/*.alut3` to **nie** są `.setting`. To zwykłe tekstowe LUT-y 3D
(nagłówek `F5LT3`), stosowane ze strony Color. Nie edytuj ich jak kompozycji.

---

## 2. Szkielet

```lua
{
    Tools = ordered() {
        MyEffect = GroupOperator {
            CtrlWZoom = false,
            Inputs  = ordered() { --[[ kontrolki widoczne w inspektorze ]] },
            Outputs = { MainOutput1 = InstanceOutput { SourceOp = "...", Source = "Output" } },
            ViewInfo = GroupInfo { Pos = { 0, 0 } },
            Tools   = ordered() { --[[ wewnętrzny graf ]] },
        },
    },
    ActiveTool = "MyEffect"
}
```

- `ordered() { ... }` zachowuje kolejność kluczy; zwykłe `{}` nie. Używaj wszędzie,
  gdzie kolejność ma znaczenie: `Inputs`, `Tools`, `UserControls`.
- `MyEffect` to identyfikator wewnętrzny — litery/cyfry/podkreślenie — i **musi
  zgadzać się z `ActiveTool`**.
- Zewnętrzne `Tools` to szczyt kompozycji; wewnętrzne `Tools` w GroupOperatorze to
  graf makra.
- **Dla strony Edit zawsze forma opakowana w `GroupOperator`.** Edit nie umie
  wyświetlić gołego grafu w inspektorze.
- **Komentarze nie są oficjalnie wspierane.** Czytnik tabel Fusion zwykle je
  toleruje, ale przy zapisie zwrotnym potrafi je wyciąć. Nie trzymaj w `.setting`
  niczego, czego nie chcesz stracić — objaśnienia trzymaj obok, w dokumentacji.

Trzy legalne kształty szczytowe: jeden `GroupOperator` (większość), jeden goły
węzeł (efekty jednowęzłowe eksponujące własne UI), wiele gołych węzłów (makra
Fusion wrzucające podgraf do kompozycji użytkownika).

`ViewInfo` ma trzy odmiany: `GroupInfo` (na GroupOperatorze), `OperatorInfo`
(zwykłe węzły wewnętrzne), `PipeRouterInfo` (tylko `PipeRouter`). Wymagane jest
tylko `Pos`.

---

## 3. Okablowanie

- **Połączenie:** `SourceOp = "NazwaWezla"`, `Source = "NazwaWyjscia"`.
  Węzeł musi istnieć w tej samej liście `Tools`.
- **Wyjścia są typowane:** obrazy → `"Output"`, maski → `"Mask"`, węzły wartości
  i splajny → `"Value"`, `TextPlus` → `"Output"` (piksele) i `"Result"`
  (rozciągnięte keyframe'y przez `KeyStretcher`).
- **Wartości skalarne:** `Input { Value = N }`
- **Enumy:** `Input { Value = FuID { "NazwaEnuma" } }`
- **Gradienty:** `Input { Value = Gradient { Colors = { [0] = {r,g,b,a}, [1] = {...} } } }`
- **Animacja:** `Input { SourceOp = "MojSplajn", Source = "Value" }` wskazujące na
  siostrzany `BezierSpline`
- **Tekst:** `StyledText { Value = "...", Array = { ... } }`

`MainInput1.Source` to wejście, do którego Resolve wpuszcza klip — na efektach
zwykle `"Input"` pierwszego węzła; na przejściach `MainInput1` i `MainInput2`
celują w `Background` / `Foreground` węzła `Merge` albo `Dissolve`.

---

## 4. Animacja: `BezierSpline` (klatki bezwzględne)

```lua
TextAlpha = BezierSpline {
    SplineColor = { Red = 180, Green = 180, Blue = 180 },
    NameSet = true,
    KeyFrames = {
        [13]  = { 0, RH = { 20, 0.333 } },
        [34]  = { 1, LH = { 27, 0.666 }, RH = { 56, 1 }, Flags = { Linear = true } },
        [101] = { 1, LH = { 78, 1 }, RH = { 105, 0.666 }, Flags = { Linear = true } },
        [115] = { 0, LH = { 110, 0.333 }, Flags = { Linear = true } },
    }
},
```

Format klatki: `[numerKlatki] = { wartosc, LH = {t, v}, RH = {t, v}, Flags = { Linear = true } }`.
`LH` / `RH` to lewy i prawy uchwyt (czas, wartość). `Flags.Linear` wyłącza
interpolację Béziera po tej stronie.

Konsumpcja w węźle:

```lua
Alpha = Input { SourceOp = "TextAlpha", Source = "Value" },
```

**`PublishNumber`** — jedna liczba dzielona przez wiele węzłów, bez kosztu
krzywej. Nie animuje; do animacji `BezierSpline`.

```lua
Publish1 = PublishNumber { Inputs = { Value = Input { Value = 0.094 } } },
-- konsument:
Width = Input { SourceOp = "Publish1", Source = "Value" },
```

---

## 5. Animacja: `LUTLookup` + `LUTBezier` (rampa 0→1 przez długość klipu)

**To jest cały mechanizm postępu przejścia. Nie ma parametru „Progress" i nie ma
sensu go szukać.** Fusion sam wylicza rampę na długości klipu.

```lua
AnimCurves1 = LUTLookup {
    Inputs = {
        Source  = Input { Value = FuID { "Duration" } },   -- pełna długość klipu
        Curve   = Input { Value = FuID { "Easing" } },
        EaseIn  = Input { Value = FuID { "Cubic" } },
        EaseOut = Input { Value = FuID { "Cubic" } },
        Lookup  = Input { SourceOp = "AnimCurves1Lookup", Source = "Value" },
        Scale   = Input { Value = 10 },   -- wyjście mnożone przez Scale
        Offset  = Input { Value = 0 },
    },
},
AnimCurves1Lookup = LUTBezier {
    KeyColorSplines = {
        [0] = {
            [0] = { 0, RH = { 0.333, 0.333 }, Flags = { Linear = true } },
            [1] = { 1, LH = { 0.666, 0.666 }, Flags = { Linear = true } }
        }
    },
    SplineColor = { Red = 255, Green = 255, Blue = 255 },
},
```

Konsumpcja:

```lua
Dissolve1 = Dissolve {
    Inputs = { Mix = Input { SourceOp = "AnimCurves1", Source = "Value" } },
},
```

**Goły `LUTLookup {}` bez wejścia `Lookup`** sam bierze wbudowane źródło
`Duration` i daje liniową rampę 0→1. To poprawny skrót na „liniowy postęp".

**Kluczowa różnica:** `BezierSpline` używa `KeyFrames` z **bezwzględnymi numerami
klatek**; `LUTBezier` używa `KeyColorSplines` z zewnętrznym `[0]` (indeks kanału)
i wewnętrznymi kluczami **0.0–1.0** (pozycja znormalizowana). Efekty pisane ręcznie,
które napędzają postęp przejścia przez `BezierSpline`, grają w złym tempie albo
zamarzają.

`LUTBezier` przyjmuje opcjonalne wejście `TimeCurve`, które nadpisuje domyślne
źródło czasu — stingery i przejścia kotwiczą tak animację do punktów wejścia/wyjścia.

---

## 6. Tytuły: `KeyStretcher` albo animacja zamarza

`TextPlus` z zapieczoną animacją `BezierSpline` ma **stałą długość w klatkach**.
Jeśli wyeksponujesz jego `Output` wprost jako `MainOutput1`, animacja zagra w
pierwszych N klatkach niezależnie od długości klipu — 5-sekundowy tytuł
odgrywa 4 sekundy ruchu i stoi przez ostatnią.

Naprawa: owiń wyjście w `KeyStretcher` i wypuść `Source = "Result"`.

```lua
Stretcher = KeyStretcher {
    Inputs = {
        Keyframes    = Input { SourceOp = "Text", Source = "Output" },
        SourceEnd    = Input { Value = 119 },   -- natywna długość animacji
        StretchStart = Input { Value = 10 },
        StretchEnd   = Input { Value = 100 },
    },
},
```

```lua
Outputs = { MainOutput1 = InstanceOutput { SourceOp = "Stretcher", Source = "Result" } },
```

**`"Result"`, nie `"Output"`.** `Output` to piksele nierozciągnięte. Pomyłka tutaj
jest niewidoczna do momentu, w którym ktoś zmieni długość klipu.

Pełny szablon: `assets/TitleTemplate.setting`.

---

## 7. Eksponowanie kontrolek (`InstanceInput`)

Każdy wpis w `GroupOperator.Inputs` re-eksponuje jeden parametr jednego węzła
wewnętrznego. Kolejność listy = kolejność w inspektorze.

```lua
Inputs = ordered() {
    Input1 = InstanceInput { SourceOp = "Text", Source = "StyledText" },
    Input2 = InstanceInput { SourceOp = "Text", Source = "Font",  ControlGroup = 2 },
    Input3 = InstanceInput { SourceOp = "Text", Source = "Style", ControlGroup = 2 },
    Size   = InstanceInput { SourceOp = "Text", Source = "Size",   Default = 0.08 },
    Pos    = InstanceInput { SourceOp = "Text", Source = "Center", Name = "Position" },
    Red    = InstanceInput { SourceOp = "Text", Source = "Red",   Name = "Color", ControlGroup = 10, Default = 1 },
    Green  = InstanceInput { SourceOp = "Text", Source = "Green", Name = "Color", ControlGroup = 10, Default = 1 },
    Blue   = InstanceInput { SourceOp = "Text", Source = "Blue",  Name = "Color", ControlGroup = 10, Default = 1 },
},
```

`ControlGroup = N` scala kilka kontrolek w jeden widget (np. RGBA w próbnik
koloru). **`N` musi być równe numerowi wejścia kotwiczącego grupę.**
`Width` na `InstanceInput` to szerokość kolumny w inspektorze, **nie** rozmiar maski.

---

## 8. Wyrażenia zamiast keyframe'ów

Każdy `Input {}` może nieść `Expression = "..."` zamiast (albo obok) `Value`.
Fusion liczy string jako wyrażenie Lua przy renderze.

```lua
Center = Input { Expression = "Point(Horizontal, Vertical)" },
Offset = Input { Value = 50, Expression = "pEmitter1_3.CubeRgn.Depth/2" },
SecondOperand = Input { Value = 10, Expression = "11-CustomTool1_1.Speed" },
```

Widoczne w wyrażeniu: wejścia tego samego węzła po gołej nazwie, wejścia innych
węzłów po kropce, konstruktory (`Point(x, y)`), `time` (numer klatki), arytmetyka Lua.

Gdy `Expression` stoi obok `Value`, `Value` jest fallbackiem (używanym, gdy
wyrażenia nie da się policzyć albo przy pierwszym ładowaniu pliku).

---

## 9. Dwanaście pułapek

1. **`ordered()` vs `{}`** — kolejność naprawdę ma znaczenie w `Inputs`, `Tools`, `UserControls`.
2. **`ActiveTool` musi wskazywać istniejący klucz szczytowy.**
3. **`SourceOp` musi się rozwiązywać** — wskazywany węzeł w tej samej liście `Tools`.
4. **Nazwy w `Source` są dokładne i wrażliwe na wielkość liter.**
5. **Nie szukaj „Progress" w przejściu** — rampa jest darmowa (§5). Jeśli przejście
   gra w jednej klatce albo nie animuje się wcale, prawdopodobnie wpuściłeś statyczną
   wartość w `Dissolve.Mix` zamiast `LUTLookup`.
6. **Tytuł bez `KeyStretcher` nie rozciąga się** (§6).
7. **`MainOutput1.Source` tytułu to `"Result"`, nie `"Output"`** (§6).
8. **Węzły generujące piksele** (`Background`, `FastNoise`, `TextPlus`, `RectangleMask`,
   `EllipseMask`) mają parę `Width`/`Height`. Dla strony Edit **zawsze**
   `UseFrameFormatSettings = Input { Value = 1 }`, żeby węzeł dziedziczył
   rozdzielczość timeline'u zamiast zamarzać na 1920×1080. Bez tego efekt psuje się na 4K.
9. **Klucze z kropką wymagają cudzysłowu i nawiasów:**
   `["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" } }`. Boli najbardziej na
   węzłach 3D (`Transform3DOp.Translate.X`) i OFX.
10. **Wartości `FuID` muszą być dokładne.** Zły string ładuje się bez błędu, a
    parametr **cicho wraca do domyślnego**. Nie zgaduj — podejrzyj działającą kompozycję.
11. **Nie powtarzaj nazw węzłów w obrębie jednej grupy.** Kolizja daje „wygrywa
    ostatni": tylko ostatnia definicja jest honorowana, a wszystkie `SourceOp`
    rozwiązują się do niej.
12. **`Instance_NazwaWezla` to wzorzec magiczny.** `Instance_X` z `SourceOp = "X"`
    **na poziomie węzła** (nie wewnątrz `Input`) tworzy żywy klon dzielący parametry
    oryginału. Używaj, gdy ta sama maska/tekst/krzywa ma wystąpić w dwóch miejscach grafu.

Dodatkowo:
- **`CustomData` jest opcjonalne — wytnij je.** Stockowe efekty niosą wielkie bloki
  `CustomData.Settings` z zapisanym stanem UI; usunięcie ich niczego nie psuje.
- **Zepsuty `.setting` wywala kategorię, nie Resolve.** Cała kategoria znika z
  biblioteki — to jest objaw, po którym poznajesz błąd składni.
- **`Dissolve.Map` to kształt wycieraczki.**
- **`PipeRouter`** jest przelotką bez wpływu na obraz; służy porządkowi w grafie i
  nie musi być eksponowany.
- **Węzły OFX wymagają obowiązkowego bloku siedmiu parametrów:** `blendGroup`,
  `blendIn`, `blend`, `ignoreContentShape`, `legacyIsProcessRGBOnly`,
  `refreshTrigger`, `resolvefxVersion`. Pominięcie któregokolwiek cofa węzeł do
  wartości domyślnych albo uniemożliwia załadowanie efektu. **Skopiuj blok
  dosłownie z działającego pliku stockowego.**
- **`BTNCS_Execute`** (przyciski `Fuse.Wireless`) odwołuje się do kluczy
  `InstanceInput` (`'Input9'`), **nie** do nazw parametrów węzłów wewnętrznych
  (`'Start'`). Zapis pod nazwą wewnętrzną cicho nic nie robi.

---

## 10. Ściąga: rola → kształt

| Chcę | Szczyt | MainInput | MainOutput | Napęd animacji |
|---|---|---|---|---|
| filtr na klip | GroupOperator | `MainInput1` → `Input` pierwszego węzła | `"Output"` | dowolny |
| przejście | GroupOperator | `MainInput1` + `MainInput2` → `Background`/`Foreground` | `"Output"` | `LUTLookup` (auto 0→1) |
| tytuł | GroupOperator na `TextPlus` | brak | `KeyStretcher` → `"Result"` | `BezierSpline` + `KeyStretcher` |
| generator / tło | GroupOperator lub goły węzeł | brak | `"Output"` | `BezierSpline` lub `Expression` |
| makro Fusion | dowolny | opcjonalny | opcjonalny | dowolny |
