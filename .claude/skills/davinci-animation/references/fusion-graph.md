# Graf Fusion przez MCP — budowa i animacja

Narzędzie: `fusion_comp`. Celujesz albo w kompozycję klipu (podaj `clip_id`,
`timeline_item_id` albo `timeline_item={track_type, track_index, item_index}`),
albo w aktywną kompozycję strony Fusion (pomiń zakres timeline'u).

---

## 1. Ostrzeżenie, od którego trzeba zacząć

**ODCZYT ZWROTNY NIE JEST DOWODEM DLA PARAMETRÓW FUSION.**

Do wersji 2.98.4 każdy zapis wartości szedł wewnątrz `Comp.Lock()`. Wartość
zapisana pod blokadą kompozycji **jest przechowywana w grafie i zwracana przez
`get_input`, a render ignoruje ją całkowicie** (Studio 19.1.3.7: PSNR `inf`
wobec baseline'u bez kompozycji). Cztery z sześciu dotkniętych ścieżek —
`set_input`, `safe_set_inputs`, `set_text_plus`, `add_fusion_mask` — potwierdzono
jako zepsute renderem. `bulk_set_inputs` i `bulk_set_expressions` uciekły, bo
opakowują zapis w `StartUndo`/`EndUndo`. Naprawione w 2.98.5, mechanizm ustalony
w 2.98.8.

Lekcja przeżyła bug: **parametr Fusion, który poprawnie się odczytuje, nie
dowiódł niczego o wyjściu.** Każdy look potwierdzaj wyrenderowaną klatką
(`gallery_stills grab_and_export` albo klatka z dostarczonego renderu),
nigdy `get_input`.

Druga warstwa tego samego problemu: to, czy kompozycja utworzona przez API jest
honorowana przy renderze, **zależy od wersji Resolve**. Podpięta kompozycja
renderowała się na Studio 19.1.3.7, a na Studio 21.0.4 ta sama konfiguracja
Blura i wariant z Transformem wyrenderowały się bit-identycznie z baseline'em bez
kompozycji. Żadne API nie wybiera aktywnej kompozycji elementu. Jeśli klient jest
na 21.x — **sprawdź to renderem, zanim zbudujesz na tym cały efekt.**

---

## 2. Kolejność, która działa

```
# 1. utwórz kompozycję na klipie
timeline_item_fusion(action="add_comp",
  params={"track_type": "video", "track_index": 1, "item_index": 0})

# 2. rozpoznaj, co jest w grafie
fusion_comp(action="probe_fusion_comp", params={"include_io": true, "timeline_item": {...}})

# 3. dodaj węzeł
fusion_comp(action="add_tool",
  params={"tool_type": "Glow", "timeline_item": {...}})

# 4. ustaw wartości (partiami, nie po jednej)
fusion_comp(action="bulk_set_inputs", params={"ops": [
  {"timeline_item": {...}, "tool_name": "Glow1", "input_name": "Gain",   "value": 0.8},
  {"timeline_item": {...}, "tool_name": "Glow1", "input_name": "Blend",  "value": 1.0}
]})

# 5. podłącz
fusion_comp(action="safe_connect_tools",
  params={"target_tool": "MediaOut1", "input_name": "Input", "source_tool": "Glow1"})

# 6. raport granic
fusion_comp(action="fusion_boundary_report", params={"timeline_item": {...}})

# 7. DOWÓD — wyrenderowana klatka
resolve_control(action="open_page", params={"page": "color"})
gallery_stills(action="grab_and_export", params={"folder_path": "/tmp/proof", "format": "jpg"})
```

Krok 7 nie jest opcjonalny.

---

## 3. Akcje `fusion_comp`

**Graf:**
- `add_tool(tool_type, x?, y?, name?)` — typowe: `Merge`, `Background`, `TextPlus`,
  `Transform`, `Blur`, `ColorCorrector`, `RectangleMask`, `EllipseMask`, `Tracker`,
  `MediaIn`, `MediaOut`, `Glow`, `DeltaKeyer`, `UltraKeyer`, `FilmGrain`, `CornerPositioner`
- `delete_tool(tool_name)`, `get_tool_list(type?)`, `find_tool(name)`
- `connect(target_tool, input_name, source_tool, output_name?)`, `disconnect(tool_name, input_name)`
- `copy_tool(tool_name, name?, x?, y?)` — duplikat (ustawienia przez tymczasowy `.setting`)
- `get_position` / `set_position(tool_name, x, y)`, `auto_arrange(tool_names?, direction?, spacing?, x?, y?)`

**Wartości:**
- `set_input(tool_name, input_name, value, time?)` / `get_input(tool_name, input_name, time?)`
- `get_inputs(tool_name)` / `get_outputs(tool_name)`, `set_attrs` / `get_attrs`
- **`add_keyframe(tool_name, input_name, time, value)`** — to jest animacja w Fusion przez API
- `bulk_set_inputs(ops)` / `bulk_set_expressions(ops)` — wsad przez wiele kompozycji naraz;
  **preferuj je**, bo opakowują zapis w undo i historycznie nie łapały buga z blokadą

**Czas i render:**
- `get_comp_info`, `set_frame_range(start, end)`, `get_frame_range`, `render`
- `start_undo(name?)` / `end_undo(keep?)`

**Bezpieczne wrappery (kernel, v2.12.0+):**
- `fusion_graph_capabilities`, `probe_fusion_comp(include_io?, max_tools?)`,
  `probe_fusion_tool(tool_name, include_io?)`
- `safe_add_tool(tool_type, name?, dry_run?)`, `safe_set_inputs(tool_name, inputs, readback?)`,
  `safe_connect_tools(target_tool, input_name, source_tool, dry_run?)`
- `fusion_boundary_report(include_io?)`
- `add_fusion_mask(mask_type?, width?, height?, corner_radius?, center?|center_x?/center_y?,
  angle?, soft_edge?, border_width?, invert?, inputs?, connect_to?, connect_input?, readback?)`
  — jednym wywołaniem: maska Rectangle/Ellipse (np. zaokrąglone rogi), parametry w 0..1,
  opcjonalne wpięcie w wejście maski celu (domyślnie `EffectMask`)
- `set_text_plus(text, tool_name?, input_name?)` / `get_text_plus(...)` — tekst węzła `Text+`
  albo szablonu tytułu Fusion. Sam znajduje `Text+`, gdy `tool_name` pominięty;
  `input_name` domyślnie `StyledText`.
  **Dla tytułów generatorowych (nie-Fusion) używaj `timeline(action="set_title_text")`.**

**Grupy jako pliki:**
- `group_settings_export(group_name, path, include_advisory?)`
- `group_settings_splice_inputs(source_path, template_path, dest_path?, ...)` — podmienia blok
  `Inputs = ordered() {...}` jednego `.setting` blokiem z drugiego, zachowując wnętrze
- `group_settings_load(group_name, settings_path, backup_path?, undo_name?)` — wgrywa `.setting`
  na żywą grupę z auto-backupem i opakowaniem w undo (Ctrl+Z cofa)

---

## 4. Animacja w grafie — trzy drogi

**A. Keyframe'y przez API** — najprostsza, gdy sterujesz z asystenta:

```
fusion_comp(action="add_keyframe", params={
  "tool_name": "Transform1", "input_name": "Size", "time": 0,  "value": 0.6})
fusion_comp(action="add_keyframe", params={
  "tool_name": "Transform1", "input_name": "Size", "time": 24, "value": 1.0})
```

**B. Wyrażenia Lua** — parametr staje się funkcją czasu, bez keyframe'ów:

```
fusion_comp(action="bulk_set_expressions", params={"ops": [
  {"timeline_item": {...}, "tool_name": "Transform1", "input_name": "Angle",
   "expression": "time * 2"}
]})
```

Wyrażenie widzi: inne wejścia **tego samego** węzła po gołej nazwie (`Horizontal`),
wejścia innych węzłów przez kropkę (`pEmitter1.CubeRgn.Depth`), konstruktory
(`Point(x, y)`), zmienną `time` (numer klatki) i arytmetykę Lua.

**C. Gotowy `.setting` z zapieczonym `BezierSpline`** — gdy animacja ma być
przenośna i wielokrotnego użytku. Patrz `setting-templates.md`; wgrywasz przez
`group_settings_load` albo `timeline_item_fusion(action="import_comp")`.

Wybór: **A** do jednorazowego ruchu na jednym klipie, **B** do ruchu ciągłego
(obrót, drift, oscylacja), **C** do wszystkiego, co ma trafić do biblioteki.

---

## 5. Sanity check przed oddaniem

- [ ] Kompozycja istnieje na właściwym elemencie (`get_comp_count` > 0)
- [ ] `get_tool_list` pokazuje węzły, które dodałeś (nazwy zgadzają się z tym, czego używasz)
- [ ] `fusion_boundary_report` nie zgłasza wiszących wejść
- [ ] Wyjście prowadzi do `MediaOut1`
- [ ] **Wyrenderowana klatka pokazuje efekt** — nie odczyt parametru
- [ ] Jeśli Resolve to 21.x: klatka wyrenderowana z kompozycją **różni się** od klatki bez niej

Mapa granic kernela kompozycji do samodzielnego odtworzenia:

```bash
python3.11 tests/live_fusion_composition_validation.py --output-dir /tmp/fusion-composition-probe
```

Harness tworzy jednorazowy projekt, generuje syntetyczne media, sonduje tworzenie
kompozycji, bezpieczne dodawanie węzłów, zapisy wejść, inspekcję grafu,
połączenia, zapisy wsadowe, zakres klatek i eksport kompozycji — po czym sprząta
po sobie.
