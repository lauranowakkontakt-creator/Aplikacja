# Remotion — wideo jako React

Remotion renderuje wideo, uruchamiając drzewo Reacta raz na klatkę i zapisując
wynik. Nie ma pętli odtwarzania, nie ma stanu między klatkami. Każda klatka jest
niezależnym, czystym renderem.

---

## 1. Struktura projektu

`src/Root.tsx` deklaruje wszystkie kompozycje. Kompozycja to jedno wideo.

```tsx
import { Composition } from 'remotion';
import { Intro } from './Intro';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Intro"                 // używany w CLI i w Studio
      component={Intro}
      durationInFrames={150}     // 5 s przy 30 fps
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: 'Cześć' }}
    />
  </>
);
```

`durationInFrames`, `fps`, `width`, `height` są obowiązkowe. Wszystko liczy się
w klatkach, nie w sekundach — sekundy przeliczasz sam: `sekundy * fps`.

**Pion pod rolki:** `width={1080} height={1920}`. Osobna kompozycja, nie
skalowanie w CSS.

---

## 2. Reguła numer jeden: klatka jest jedynym wejściem

```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const Intro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // ...
};
```

`useCurrentFrame()` zwraca klatkę **względem najbliższej `<Sequence>`**, nie
względem całego wideo. To jest cecha, nie błąd — dzięki temu komponent w sekwencji
animuje się „od siebie".

---

## 3. Interpolacja

```tsx
import { interpolate } from 'remotion';

const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

**Zawsze podawaj `extrapolateRight: 'clamp'`** przy fade-in, inaczej wartość leci
dalej w nieskończoność i po 20 klatkach masz `opacity: 5`.

Wielopunktowo (odpowiednik keyframe'ów):

```tsx
const scale = interpolate(
  frame,
  [0, 15, 120, 135],     // wejście, trzymanie, wyjście
  [0.8, 1, 1, 0.8],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);
```

Tablice wejścia i wyjścia muszą mieć tę samą długość, a wejście musi rosnąć.

Easing:

```tsx
import { interpolate, Easing } from 'remotion';

const x = interpolate(frame, [0, 30], [0, 500], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  extrapolateRight: 'clamp',
});
```

---

## 4. Sprężyna

```tsx
import { spring } from 'remotion';

const scale = spring({
  frame,
  fps,
  config: { damping: 200, stiffness: 100, mass: 1 },
});
```

`spring()` domyślnie idzie 0 → 1 i **sam się nie zatrzymuje na sztywno** — jeśli
potrzebujesz konkretnego zakresu, złóż to z `interpolate`:

```tsx
const progress = spring({ frame, fps, config: { damping: 200 } });
const y = interpolate(progress, [0, 1], [100, 0]);
```

`damping: 200` daje ruch bez przestrzelenia. Niższy damping (np. 10) daje
charakterystyczne odbicie. `durationInFrames` w configu sprężyny przycina ją do
zadanej długości.

Kiedy co: **`spring` do wejść elementów UI** (naturalne, organiczne),
**`interpolate` do wszystkiego, co ma trafić w konkretną klatkę** (synchron do
muzyki, cięcia, napisy).

---

## 5. Sekwencjonowanie

```tsx
import { Sequence, Series } from 'remotion';

<Sequence from={0} durationInFrames={60}>
  <Tytul />
</Sequence>
<Sequence from={60} durationInFrames={90}>
  <Tresc />
</Sequence>
```

Wewnątrz `<Sequence from={60}>` komponent widzi `useCurrentFrame() === 0` w
klatce 60 globalnej. Dzięki temu każdy blok animujesz „od zera".

`<Series>` robi to samo bez ręcznego liczenia offsetów:

```tsx
<Series>
  <Series.Sequence durationInFrames={60}><Tytul /></Series.Sequence>
  <Series.Sequence durationInFrames={90}><Tresc /></Series.Sequence>
</Series>
```

Pomocne obok: `<AbsoluteFill>` (kontener 100%/100% z `position: absolute`),
`<Freeze frame={n}>`, `<Loop durationInFrames={n}>`.

---

## 6. Media — używaj komponentów Remotion, nie HTML-a

To jest twarda reguła. Natywne `<video>`, `<img>`, `<audio>` w renderze nie są
zsynchronizowane z klatką i nie blokują renderu do czasu załadowania.

| Zamiast | Użyj | Po co |
|---|---|---|
| `<video>` | `<OffthreadVideo src={...} />` | wyciąga dokładnie tę klatkę wideo przez ffmpeg; deterministyczne |
| `<img>` | `<Img src={...} />` | render czeka, aż obraz się załaduje |
| GIF | `<Gif src={...} />` (`@remotion/gif`) | klatka GIF-a wiązana z klatką wideo |
| `<audio>` | `<Audio src={...} />` | ścieżka trafia do miksu wyjściowego |

Pliki lokalne podajesz przez `staticFile('nazwa.mp4')` — plik leży w `public/`.

```tsx
import { OffthreadVideo, Img, Audio, staticFile } from 'remotion';

<OffthreadVideo src={staticFile('material.mp4')} startFrom={90} />
<Img src={staticFile('logo.png')} />
<Audio src={staticFile('muzyka.mp3')} volume={0.4} />
```

`<Audio volume={...}>` przyjmuje też funkcję klatki — tak robi się fade audio:

```tsx
<Audio
  src={staticFile('muzyka.mp3')}
  volume={(f) => interpolate(f, [0, 30], [0, 1], { extrapolateRight: 'clamp' })}
/>
```

`<OffthreadVideo>` bierze `startFrom` / `endAt` w klatkach **wideo źródłowego**.
`playbackRate` zmienia tempo, ale nie zmienia długości sekwencji — długość
kontroluje `<Sequence durationInFrames>`.

---

## 7. Komponent Remotion ≠ komponent interaktywny

Najczęstsze źródło zepsutych renderów. Komponent, który trafia do kompozycji:

**Nie może:**
- mieć `onClick`, `onHover`, `onChange` ani żadnej obsługi zdarzeń — nikt ich nie kliknie
- używać `setTimeout`, `setInterval`, `requestAnimationFrame` do animacji
- używać `Math.random()`, `Date.now()`, `new Date()`
- pobierać danych w `useEffect` bez `delayRender`
- trzymać stanu, który zmienia się między klatkami (`useState` z animacją)
- zależeć od rozmiaru okna, media queries, `window.innerWidth`

**Musi:**
- być czystą funkcją swoich propsów i bieżącej klatki
- wyprowadzać każdą wartość ruchu z `useCurrentFrame()`
- mieć jawnie zadane wymiary w pikselach (kompozycja ma stały rozmiar, więc `px` jest tu bezpieczniejsze niż `%` czy `vw`)

Losowość, gdy jest potrzebna — deterministyczna:

```tsx
import { random } from 'remotion';

const particles = new Array(50).fill(0).map((_, i) => ({
  x: random(`x-${i}`) * 1920,   // ten sam seed = ta sama wartość w każdym renderze
  y: random(`y-${i}`) * 1080,
}));
```

Dane z zewnątrz — tylko z blokadą renderu:

```tsx
import { delayRender, continueRender } from 'remotion';

const [handle] = useState(() => delayRender('pobieram dane'));
useEffect(() => {
  fetch(url).then(r => r.json()).then(d => { setData(d); continueRender(handle); });
}, []);
```

Lepiej jednak: pobierz dane **przed** renderem i wstrzyknij jako propsy
(`--props`), niż w środku komponentu.

---

## 8. Parametryzacja i warianty

Tu Remotion wygrywa z każdym edytorem. Propsy sterują wszystkim, a
`calculateMetadata` pozwala im sterować także długością wideo:

```tsx
<Composition
  id="Karta"
  component={Karta}
  schema={kartaSchema}              // zod, daje UI w Studio
  defaultProps={{ tekst: 'x', slowa: [] }}
  calculateMetadata={({ props }) => ({
    durationInFrames: Math.ceil(props.slowa.length * 12) + 60,
    fps: 30,
  })}
  width={1080}
  height={1920}
/>
```

Render z danymi:

```bash
npx remotion render Karta out/karta-01.mp4 --props='{"tekst":"Pierwszy"}'
```

Pętla po pliku JSON w bashu daje 50 wariantów bez dotykania kodu.

---

## 9. Render z CLI

```bash
npx remotion studio                                   # podgląd na żywo
npx remotion still Intro out/klatka.png --frame=45    # WERYFIKACJA — rób to często
npx remotion render Intro out/intro.mp4               # H.264, domyślnie
npx remotion render Intro out/intro.mov --codec=prores --prores-profile=4444
npx remotion render Intro out/intro.mov --codec=prores --image-format=png   # z alfą
npx remotion render Intro out/seq/%04d.png --sequence                       # sekwencja PNG
```

Przydatne flagi: `--concurrency=N`, `--frames=0-60` (render fragmentu przy
debugowaniu), `--scale=0.5` (szybki podgląd), `--log=verbose`.

**Do dalszej obróbki w Resolve renderuj ProRes 4444, nie H.264** — H.264 nie
niesie alfy i traci jakość przy kolejnym przejściu przez enkoder.

---

## 10. Wydajność

- `<OffthreadVideo>` jest kosztowny — nie trzymaj dziesięciu naraz, jeśli
  widoczny jest jeden. Owijaj w `<Sequence>`, żeby istniał tylko wtedy, gdy gra.
- Ciężkie obliczenia licz raz: `useMemo` po propsach, nie po klatce.
- Cienie, blur i filtry CSS mnożą czas renderu. `will-change` nic tu nie da.
- Fonty ładuj przez `@remotion/google-fonts` albo `delayRender` — inaczej pierwsze
  klatki wyrenderują się fallbackiem, a reszta docelowym krojem.
