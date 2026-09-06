# DaVinci Resolve przez MCP — sterowanie żywą sesją

Serwer MCP mostkuje asystenta do oficjalnego Scripting API DaVinci Resolve.
Zasięg: projekty, media, timeline, klipy, grading, Fusion, audio, kolejka renderu.

---

## 1. Zanim cokolwiek zawoła

**Wymagania:**
- Resolve **Studio** uruchomiony, `Preferences ▸ General ▸ External scripting using` = `Local`
  (albo `Network` + `RESOLVE_SCRIPT_HOST` wskazujące host; `127.0.0.1` lokalnie)
- Python **3.10+**. Górnego limitu nie ma, ale na starszych buildach Resolve
  mostek potrafi nie załadować się na 3.13+ (`scriptapp("Resolve")` zwraca `None`).
  Jeśli to trafisz — odtwórz venv na 3.10–3.12.

**Wersja darmowa.** Obie powyższe preferencje to funkcje Studio, a `scriptapp("Resolve")`
i tak odmawia obcemu procesowi. Obejście: skrypt uruchomiony z menu
`Workspace ▸ Scripts` dostaje żywy obiekt `resolve` na każdej edycji i
re-eksportuje go przez uwierzytelniony listener na loopbacku.
Instalacja: `python scripts/install_resolve_bridge.py`, potem start z tego menu.
Zmienna `DAVINCI_RESOLVE_BRIDGE=1` *wymusza* ten transport (błędy wychodzą
wprost, zamiast cicho degradować do innej ścieżki).

Na macOS Resolve szuka Pythona 3 wyłącznie przez `PYTHON3HOME`, a potem
`/usr/local/bin/python3`. Interpretery z Homebrew/pyenv/uv/conda są dla niego
niewidoczne — bez żadnego błędu.

**Instalacja serwera:** `npx davinci-resolve-mcp setup`.

**Pierwsze wywołanie:** `resolve_control(action="launch")`. Serwer sam uruchomi
Resolve, jeśli nie działa — pierwsze połączenie potrafi trwać do 60 s.

---

## 2. Tryby serwera

| Tryb | Wejście | Liczba narzędzi | Kiedy |
|---|---|---|---|
| **Compound** (domyślny) | `src/server.py` | 36 | prawie zawsze — mniej kontekstu, pogrupowane akcje |
| Granular | `src/server.py --full` | 353 | jedno narzędzie na metodę API, gdy potrzebna surowa powierzchnia |
| Advanced (offline, Node) | `davinci-resolve-advanced` | 18 | edycja `.drp`/`.drt`/`.drx` i bazy projektu **bez** uruchomionego Resolve |

Ta referencja opisuje **compound**. Każde narzędzie przyjmuje `action` (string) i
opcjonalny `params` (obiekt).

Reguła podziału pracy: **żywą sesję prowadź serwerem Pythona; matematykę
grade'ów, QC, conform i edycje plikowe licz serwerem advanced, a wynik wnoś przez
serwer żywy.**

Serwer headless (`-nogui`) jest **funkcjonalnie identyczny** z sesją GUI
(zmierzone na 238 sparowanych obserwacjach). Nie zakładaj, że coś „nie działa bez
GUI" — dwa wyjątki niżej w gotchas.

---

## 3. Koperta operacji — jak czytać wynik

Każdy wynik niesie blok `_operation` obok normalnego ładunku:

```json
{
  "success": true,
  "insert_frame_absolute": 86400,
  "_operation": {
    "status": "success",
    "operation": "timeline.ripple_insert",
    "execution_id": "exec_d2c123817bee",
    "verification": {
      "status": "passed",
      "checks": [{"check": "readback_verification", "passed": true}],
      "contradiction": false
    },
    "changes": {"items_added": 3, "items_moved": 17, "items_deleted": 0}
  }
}
```

- **`status`** — `success` | `partial` | `blocked` | `failed`.
  `blocked` = czeka bramka potwierdzenia; ładunek niesie `confirm_token` i `preview`.
- **`verification.status`** — `passed` | `failed` | `partial` | `contradiction` | `unverified`.
  **`contradiction` to jedyny status, na którym zatrzymujesz się natychmiast**:
  Resolve zgłosił sukces, a odczyt zwrotny mówi co innego.
  **`unverified` znaczy „nie zaraportowano dowodu", nie „sprawdzone i czyste"** —
  jeśli potrzebujesz pewności, odczytaj stan sam.
- **`changes`** — delta semantyczna. **Brak pola znaczy „nie zaraportowano",
  nigdy „nic się nie zmieniło".**
- **`execution_id`** — koreluje jedno wywołanie w logach i transkryptach.

Kształt koperty zmienia `setup(action="set_defaults", params={"result_envelope": "pure"|"legacy"|"dual"})`,
per wywołanie `params={"envelope": "pure"}`, per proces `RESOLVE_MCP_RESULT_ENVELOPE`.

---

## 4. Kontekst strony — sprawdź, zanim zawołasz

Resolve jest aplikacją stronicową. Część operacji działa tylko na właściwej stronie.

| Kategoria operacji | Wymagana strona |
|---|---|
| Grading, node graphy, CDL | Color |
| Eksport stilli z Gallery, `grab_and_export` | Color + otwarty panel Gallery |
| Kompozycje Fusion (comp strony) | Fusion |
| Edycja timeline'u, operacje na ścieżkach | Edit lub Cut |
| Audio Fairlight | Fairlight |
| Render / dostawa | Deliver |
| Import mediów, przeglądanie storage | Media |

Przełączenie: `resolve_control(action="open_page", params={"page": "color"})`.

> Gdy narzędzie zwraca nieoczekiwane `False` albo błąd o kontekście — **najpierw
> sprawdź stronę.**

---

## 5. Mapa narzędzi

### `knowledge` — wiedza warsztatowa (bez połączenia z Resolve)
Prozą podane rzemiosło: montaż, kolor, audio, workflow. **Czytaj temat PRZED
operacją twórczą lub destrukcyjną, nie po.** Narzędzia chętnie wykonają
montażowo błędną decyzję; tu leży uzasadnienie, liczby i koszt cofnięcia.
- `topics(category?)` — indeks. Kategorie: `workflow`, `guide`, `kernel`, `reference`, `repo`
- `get(topic, section?, inline?)` — proza; działają aliasy (`"tighten"`, `"grading"`, `"conform"`)
- `search(query, limit?)`, `capabilities()`

### `resolve_control` — poziom aplikacji
`launch`, `open_page`, `get_version`, `quit`, akcje śladu wykonania (traces).

### `project_manager` / `project` — projekty
`load`, `create`, `close`, `delete`, ustawienia projektu, foldery.

### `media_storage` / `media_pool` / `folder` — media
Bezpieczny import, sekwencje obrazów, organizacja binów, metadane.
IDs klipów bierzesz z `media_pool(action="get_selected")` albo `folder(action="get_clips")`.

### `timeline` — timeline
`get_items`, `set_current`, `append`, `insert`, `delete_clips`, `ripple_insert`,
`set_title_text`, `thumbnail_contact_sheet`, export/import.
Pozycyjny append: `MediaPool.AppendToTimeline([{clipInfo}, ...])`.

### `timeline_item` — właściwości i **keyframe'y klipu**
Klip identyfikujesz przez `track_type` + `track_index` + `item_index`
(domyślnie `"video"`, `1`, `0`).

- `get_transform` / `set_transform(Pan?, Tilt?, ZoomX?, ZoomY?, RotationAngle?, ...)`
- `get_crop` / `set_crop(CropLeft?, CropRight?, CropTop?, CropBottom?, ...)`
- `get_composite` / `set_composite(Opacity?, CompositeMode?)`
- `get_audio` / `set_audio(Volume?, Pan?, AudioSyncOffset?)`
- `get_retime` / `set_retime(process?, motion_estimation?)`
  process: `"nearest"` | `"frame_blend"` | `"optical_flow"` (albo 0–3); motion_estimation 0–6
- **`get_keyframes(property)`, `add_keyframe(property, frame, value)`,
  `modify_keyframe`, `delete_keyframe`, `set_keyframe_interpolation`**
  interpolacja: `"Linear"` | `"Bezier"` | `"EaseIn"` | `"EaseOut"` | `"EaseInOut"`
- `get_unique_id`, `get_media_pool_item`, `get_property` / `set_property(key, value)`

To jest najprostsza droga do animacji w Resolve: **transform + keyframe'y na
klipie, bez dotykania Fusion.** Ken Burns, wjazd, odjazd, animowana ramka —
wszystko tutaj. Sięgaj po Fusion dopiero, gdy potrzebujesz kompozycji.

### `timeline_item_fusion` — kompozycje na klipie
`add_comp`, `get_comp_count`, `get_comp_names`, `export_comp(path, index)`,
`import_comp(path)`, `delete_comp(name)`, `load_comp(name)`, `rename_comp`,
`set_cache(value)` — `"Auto"` | `"On"` | `"Off"`.

### `timeline_item_color` — grading na klipie (wymaga strony Color)
- `set_cdl({NodeIndex, Slope, Offset, Power, Saturation})` — Slope/Offset/Power
  jako `[R,G,B]`, krotka albo string `"1.0 1.0 1.0"`; wszystkie formy są normalizowane
- `add_version`, `load_version`, `get_version_names(type?)` — `0` lokalna, `1` zdalna
- `assign_color_group`, `remove_from_color_group`, `export_lut(type, path)`
- `stabilize`, `smart_reframe`
- `create_magic_mask(mode)` — `"F"` | `"B"` | `"BI"`; wymaga Neural Engine i strony Color.
  Magic Mask v2 izoluje przez **kliknięcia operatora**, a API nie umie ich postawić —
  bez nich zwraca `{needs_hitl: true, hitl: {...}}`. Nie wołaj tego jak automatu.

Bezpieczne wrappery (kernel koloru): `grade_capabilities`, `probe_grade_item`,
`probe_node_graph`, `safe_set_cdl`, `safe_copy_grade`, `safe_apply_drx`,
`safe_export_lut`, `grade_version_snapshot`, `grade_version_restore`.

### `timeline_item_markers`, `timeline_item_takes`, `gallery`, `gallery_stills`, `node_graph`
Markery i flagi; take'i; albumy i stille; graf węzłów koloru.

### `render` — dostawa
`add_job`, `list_jobs`, `delete_job(job_id)`, `delete_all_jobs`, start/stop,
walidacja formatów i kodeków, presety.

### `fusion_comp` — graf Fusion
Osobna referencja: `fusion-graph.md`.

---

## 6. Podgląd tego, co widzi Resolve

**Zacznij od `timeline_frame(action="capture")`.** Renderuje pojedynczą klatkę
spod playheada (albo z podanego `timecode`/`frame`) i zwraca ją jako obraz MCP —
model multimodalny po prostu na nią patrzy. `max_width` ogranicza koszt kontekstu.

```
timeline_frame(action="capture", params={"timecode": "01:00:15:12", "max_width": 1280})
```

⚠️ **API miniatur jest per-klip, nie per-klatka.** `GetCurrentClipThumbnailImage`
zwraca ten sam obraz dla każdej klatki danego klipu (zweryfikowane bajt w bajt) i
nic nie zwraca, jeśli Resolve nie jest aplikacją na wierzchu. `thumbnail_contact_sheet`
też na tym stoi — traktuj go jako inwentarz ujęć, nie dowód klatki.

Hierarchia WYSIWYG (zweryfikowana na żywo): still z `grab_and_export` wiernie
oddaje transformacje z Inspectora i grade. Miniatury z Media Pool i contact sheet
**nie** oddają wyjścia kompozycji Fusion.

```
resolve_control(action="open_page", params={"page": "color"})
gallery_stills(action="grab_and_export", params={
  "folder_path": "/tmp/resolve-preview", "format": "jpg", "cleanup": true
})
```

Odpowiedź niesie `files[0].data_base64` — zwykły JPEG do podania modelowi wizyjnemu.

---

## 7. Błędy i wyjście z nich

| Komunikat | Przyczyna | Naprawa |
|---|---|---|
| `Not connected to DaVinci Resolve` | Resolve nie działa albo skrypty wyłączone | `resolve_control(action="launch")`, odczekaj, ponów |
| `No project open` | brak wczytanego projektu | `project_manager(action="load", params={"name": "..."})` |
| `No current timeline` | projekt bez ustawionego bieżącego timeline'u | `timeline(action="set_current", params={"index": 1})` |
| `No item at index N` | `item_index` poza zakresem ścieżki | najpierw `timeline(action="get_items", ...)` |
| `Clip not found` | nieaktualny `clip_id` | odśwież ID z `media_pool(action="get_selected")` |
| `Gallery not available` | nie jesteś na stronie Color | `open_page` → `color` |
| `GrabStill failed` | zła strona albo brak klipu pod playheadem | Color + przesuń playhead na klip |
| `ExportStills failed` | panel Gallery zamknięty w UI | użytkownik musi otworzyć `Workspace ▸ Gallery` |
| `Tool '...' not found` | zła nazwa węzła Fusion | `fusion_comp(action="get_tool_list")` |
| `Color group '...' not found` | zła nazwa grupy | `color_group(action="list")` |

`{"success": False}` bez klucza `error` znaczy, że surowe API Resolve zwróciło
`False` — prawie zawsze niespełniony warunek wstępny (strona, stan, kontekst).

---

## 8. Pułapki, które kosztują najwięcej czasu

**`item_index` liczy się od 0. `track_index` liczy się od 1.** Tak, w jednym
wywołaniu obok siebie.

**Obiekty API mają czas życia.** Timeline'y, klipy i grupy zwracane przez API to
żywe referencje, które wietrzeją, gdy stan projektu się zmieni. **Po każdej
operacji destrukcyjnej odśwież ID.**

**`SetName` na aktywnym timelinie zwraca `False`.** Przełącz się na inny, zmień
nazwę, wróć.

**`DeleteProject` zwraca `False`, gdy projekt jest otwarty.** Najpierw zamknij.

**`GetNodeGraph(0)` zwraca `False`.** Nie podawaj `layer_index` — wołaj
`get_node_graph` bez niego, żeby dostać domyślny graf.

**Eksport z Gallery wymaga widocznego panelu Gallery** — i zawodzi tak samo w GUI
z zamkniętym panelem, jak headless. Porażka tutaj **nie** jest powodem do zmiany
trybu. Po piksele używaj `Project.ExportCurrentFrameAsStill`, który działa w obu.

**Zakres `fusion_comp` bez podanego timeline'u** celuje w aktywną kompozycję
strony Fusion. Chcesz comp konkretnego klipu — zawsze podaj `clip_id`,
`timeline_item_id` albo `timeline_item`.

**Windows z wieloma Pythonami:** Resolve 20.3 potrafi wysypać się przy imporcie,
jeśli `PYTHONHOME` nie wskazuje interpretera, którym zbudowano venv. Instalator
ustawia to sam; ręczne konfiguracje mogą potrzebować dopisania.

**Wersje Resolve:** akcje specyficzne dla 20.x zwracają czytelny błąd
`requires DaVinci Resolve 20.x+` na starszych buildach. Baza kompatybilności to 19.1.3.

**Materiał źródłowy jest nietykalny.** Bez wyraźnej prośby nie transkoduj, nie
konwertuj, nie rób proxy i nie zapisuj pochodnych. Analizy → sidecary albo
syntetyczne fixture'y.

---

## 9. Wzorzec rozwiązywania ID

```
# klipy w Media Pool
media_pool(action="get_clips")        # -> [{name, id}, ...]  -> id = clip_id

# elementy na ścieżce timeline'u
timeline(action="get_items", params={"track_type": "video", "track_index": 1})
# -> [{name, id, start, end, duration}, ...]
# item_index = pozycja na tej liście (od 0)
# albo zapamiętaj id i użyj timeline_item(action="get_unique_id", ...)
```
