# Przepływy end-to-end

---

## 0. Otwarcie sesji (zawsze tak samo)

```
resolve_control(action="launch")          # bezpieczne, gdy Resolve już działa
resolve_control(action="get_version")
resolve_control(action="get_page")
setup(action="get_defaults")
```

`launch` wołaj jako pierwsze w każdej nowej sesji. Pierwsze połączenie potrafi
zająć do 60 s, jeśli Resolve trzeba dopiero uruchomić.

`setup(action="schema" | "get_defaults" | "set_defaults")` służy do trwałych
domyślnych ustawień rozmowy (analiza mediów, publikowanie metadanych, markery
czasowe, styl raportu). Domyślne ustawienia mogą kształtować parametry
przyszłych narzędzi, ale **potwierdzane zapisy do projektu i tak wymagają
jawnej flagi potwierdzenia w danej akcji.**

---

## 1. Projekt i timeline

```
project_manager(action="list")
project_manager(action="load", params={"name": "Mój Film"})
timeline(action="list")
timeline(action="set_current", params={"index": 2})
timeline(action="get_current")
```

---

## 2. Import mediów i budowa timeline'u

```
media_storage(action="get_volumes")
media_storage(action="import_to_pool", params={"items": ["/sciezka/klip.mp4"]})
media_pool(action="create_timeline", params={"name": "Assembly"})
media_pool(action="get_selected")
media_pool(action="append_to_timeline", params={"clip_ids": ["<uuid>", ...]})
```

Sekwencja obrazów (np. render PNG z Remotion):

```
media_pool(action="safe_import_sequence", params={
  "pattern": "/sciezka/frames/shot_%04d.png",
  "start_index": 1, "end_index": 150,
  "target_folder": "Master/Plates"
})
```

Append pozycyjny (gdy trzeba wstawić w konkretne miejsce, np. odbudować rząd napisów):

```
media_pool(action="append_to_timeline", params={"clip_infos": [
  {"clip_id": "<uuid>", "start_frame": 0, "end_frame": 100,
   "record_frame": 1200, "track_index": 4}
]})
```

**Uwaga na mieszane fps.** `start_frame`/`end_frame` to klatki **źródła**, a
źródło o innym fps niż timeline **zaokrągla w dół** przy konwersji — klip 24.0
albo 29.97 wrzucony na timeline 23.976 potrafi wylądować o klatkę za krótki.
Planuj długości w klatkach timeline'u, wydłuż `end_frame` o klatkę źródła, gdy
podłoga nie trafia, i domknij `timeline(action="detect_gaps_overlaps")`.

**`import_media` zawsze ląduje w BIEŻĄCYM binie** — nie ma parametru celu.
Najpierw `media_pool(action="set_current_folder")`.

---

## 3. Remotion → Resolve

Najczęstszy przepływ mieszany: animacja robiona w kodzie ma wejść w montaż.

**Krok 1 — dopasuj specyfikację do timeline'u, zanim wyrenderujesz.**
fps kompozycji Remotion musi być fps timeline'u Resolve. Rozdzielczość też.
Niedopasowanie fps zobaczysz dopiero jako dryf synchronizacji na końcu materiału.

**Krok 2 — renderuj w kodeku pośrednim, nie w H.264.**

```bash
# z alfą (dolne paski, tytuły, elementy nakładane)
npx remotion render Lower3rd out/lower3rd.mov --codec=prores --prores-profile=4444 --image-format=png

# bez alfy (pełnoekranowe wstawki)
npx remotion render Intro out/intro.mov --codec=prores --prores-profile=hq
```

Alfa wymaga **ProRes 4444** i `--image-format=png`. ProRes 422 HQ nie niesie
kanału alfa, a H.264 nie niesie go w ogóle i dokłada stratę przy kolejnym
przejściu przez enkoder.

Alternatywa dająca najwięcej kontroli: `--sequence` z PNG i import przez
`safe_import_sequence` (§2).

**Krok 3 — import i ułożenie.**

```
media_pool(action="set_current_folder", params={"name": "Grafika"})
media_storage(action="import_to_pool", params={"items": ["/out/lower3rd.mov"]})
media_pool(action="append_to_timeline", params={"clip_infos": [
  {"clip_id": "<uuid>", "record_frame": 480, "track_index": 2}
]})
```

Nakładki idą na ścieżkę **wyżej** niż materiał. `track_index` liczy się od 1.

**Krok 4 — kompozycja.**

```
timeline_item(action="set_composite", params={
  "CompositeMode": "Normal", "Opacity": 100,
  "track_type": "video", "track_index": 2, "item_index": 0})
```

**Krok 5 — dowód.** `timeline_frame(action="capture")` na klatce, gdzie nakładka
ma być widoczna. Jeśli alfa nie zadziałała, zobaczysz czarne tło — i to jest
moment, żeby wrócić do kroku 2, a nie dwie godziny później.

---

## 4. Animacja bez Fusion — keyframe'y na klipie

Najtańsza droga do ruchu w Resolve. Ken Burns w pięciu wywołaniach:

```
timeline_item(action="add_keyframe", params={
  "property": "ZoomX", "frame": 0,   "value": 1.0,
  "track_type": "video", "track_index": 1, "item_index": 0})
timeline_item(action="add_keyframe", params={
  "property": "ZoomX", "frame": 120, "value": 1.25, ...})
timeline_item(action="set_keyframe_interpolation", params={
  "property": "ZoomX", "frame": 0, "interpolation": "EaseOut", ...})
```

Interpolacje: `"Linear"`, `"Bezier"`, `"EaseIn"`, `"EaseOut"`, `"EaseInOut"`.

Właściwości do animowania: `Pan`, `Tilt`, `ZoomX`, `ZoomY`, `RotationAngle`,
`Opacity`, `CropLeft`/`Right`/`Top`/`Bottom`, `Volume`.

Weryfikacja: `timeline_frame(action="capture")` na dwóch różnych klatkach —
mają się różnić.

---

## 5. Grading

```
resolve_control(action="open_page", params={"page": "color"})
timeline_item_color(action="set_cdl", params={
  "cdl": {"NodeIndex": 1, "Slope": [1.1, 1.0, 0.9],
          "Offset": [0.0, 0.0, 0.0], "Power": [1.0, 1.0, 1.0], "Saturation": 1.0},
  "track_type": "video", "track_index": 1, "item_index": 0})
timeline_item_color(action="add_version", params={"name": "Grade v2", ...})
timeline_item_color(action="grade_boundary_report", params={...})
timeline_item_color(action="safe_export_lut", params={"type": "33ptcube", "path": "/tmp/look.cube", ...})
```

Przed każdą decyzją kolorystyczną warto zajrzeć do `knowledge(action="get", params={"topic": "grading"})` —
tam leży rzemiosło, w narzędziach tylko wykonanie.

Still z grade'em (i towarzyszącym plikiem `.drx`):

```
gallery_stills(action="grab_and_export", params={"folder_path": "/tmp/stills", "format": "jpg"})
```

Odpowiedź niesie `files[].data_base64` (obraz) oraz `files[].data` (tekstowy XML `.drx`).

---

## 6. Eksport wymienny i conform

```
timeline(action="export", params={"path": "/tmp/export.edl", "type": "EDL", "subtype": "CMX3600"})
timeline(action="export", params={"path": "/tmp/export.fcpxml", "type": "FCPXML"})
timeline(action="export_timeline_checked", params={"path": "/tmp/export.drt", "format": "drt"})
timeline(action="detect_gaps_overlaps")
timeline(action="conform_boundary_report", params={"handles": 8})
```

---

## 7. Render i dostawa

```
render(action="get_formats")
render(action="probe_render_matrix")
render(action="set_format_and_codec", params={"format": "QuickTime", "codec": "H.265 Master"})
render(action="validate_render_settings", params={
  "settings": {"TargetDir": "/tmp/renders", "CustomName": "review", "SelectAllFrames": true},
  "require_temp_target": true})
render(action="prepare_render_job", params={
  "target_dir": "/tmp/renders", "settings": {"CustomName": "review", "SelectAllFrames": true}})
render(action="add_job")
render(action="list_jobs")
render(action="start")
render(action="is_rendering")
```

**Zawsze `validate_render_settings` przed `add_job`.** Kombinacja format+kodek,
która nie istnieje, przepada cicho w kolejce.

---

## 8. Kiedy sięgnąć po serwer offline (advanced)

Serwer Node (`davinci-resolve-advanced`, 18 narzędzi) edytuje pliki `.drp`/`.drt`/`.drx`
i łata bazę projektu **bez uruchomionego Resolve**. Podział pracy: żywa sesja →
serwer Pythona; matematyka grade'ów, QC, conform, edycje plikowe → advanced,
a wynik wnoś przez serwer żywy.

Reguły, które trzeba znać:

- **Przestrzeń wartości grade'u.** `drx generate`/`merge` domyślnie działają w
  `space:'ui'` — parametry to jednostki **panelu** Resolve (lift/gamma/gain/offset
  w liczbach panelowych, saturacja 0–100 z neutrum 50). `space:'drx'` tylko dla
  surowych floatów wewnętrznych. Wartości dekodowane są prawdą wyłącznie dla
  skalibrowanego zestawu natywnego — sprawdzaj znacznik `valueFidelity` w wyniku `parse`.
- **Krzywe osi barwy.** Naiwne listy punktów `[0,1]` są automatycznie
  kanonizowane do zweryfikowanej klatki Béziera. Listy już zawinięte (x poza `[0,1]`)
  są **odrzucane**, chyba że podasz `allowWrappedHueCage:true` — źle uformowana klatka
  potrafi wywalić Resolve 19. **Jeśli wynik `generate`/`merge` niesie tablicę
  `warnings`, krzywa poszła surowa i wyrenderuje się PŁASKO — powiedz to
  użytkownikowi, nie wypuszczaj po cichu.**
- **Relayout node grafu** (programowe „Cleanup Node Graph"; komenda UI nie ma API).
  Jeden klip, na żywo: `gallery_stills.grab_and_export` → advanced `drx(action="relayout")`
  → `graph.reset_all_grades` → `safe_apply_drx` z **jawnymi** indeksami elementów
  (reset jest konieczny — aplikacja o tej samej strukturze zachowa stary układ).
  Cały projekt, offline: `project_db(action="relayout_node_graphs")`.
- **Łatki `project_db`** wymagają **zamkniętego** projektu w Resolve plus
  `iConfirmProjectClosed:true`. Każdy zapis robi backup i weryfikuje odczytem.
  Resolve trzyma otwarte projekty w pamięci: **po łatce w pełni zamknij i uruchom
  Resolve ponownie**, inaczej zmiany nie będą widoczne.
- **Gwardie są nośne.** Narzędzia advanced **odmawiają zamiast zmyślać**. Rzucone
  „refused" to zwykle zła przestrzeń wejściowa, klatki w logu albo brakujące media —
  przeczytaj komunikat, zanim ponowisz. Część akcji zależy od opcjonalnych zależności
  natywnych (`better-sqlite3`, `sharp`, ffmpeg); status na żywo daje akcja `capabilities`.

---

## 9. Reguła anty-regresji przy analizie mediów

Analiza „source-safe" znaczy, że **materiał źródłowy pozostaje nietknięty** — a
nie: brak wizualnych, brak transkrypcji, brak zapisanego raportu, brak
metadanych, brak markerów w Media Pool.

Nie dodawaj `include_visuals=false`, `include_transcription=false`,
`publish_metadata=false`, `timed_markers=no`, `session_only=true` ani
`dry_run=true`, jeśli użytkownik wprost o to nie prosi albo celem nie jest surowa
ścieżka pliku, która nie może przyjąć zapisu do projektu.

Protokół wizji `host_chat_paths`: `analyze_*` zwraca odroczony ładunek z
bezwzględnymi `frame_paths` i schematem JSON. **Musisz** te klatki przeczytać jako
obrazy, wyprodukować JSON i zawołać `media_analysis(action="commit_vision", ...)`
dla każdego klipu. Pominięcie `commit_vision` zostawia przebieg w stanie
`pending_host_vision_analysis` — powiedz o tym wprost, nie ogłaszaj analizy za skończoną.
