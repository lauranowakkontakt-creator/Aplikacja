# Plansze tytułowe — Mocni w Duchu

Pięć plansz otwierających, po jednej na piosenkę. 4K, 10 sekund, przezroczyste tło.

## Co to jest

Animacja generowana z kodu (Remotion). Jedna kompozycja, pięć wariantów — tekst
jest parametrem, więc zmiana czcionki, koloru czy tempa idzie od razu na cały
komplet. Nie ma pięciu osobnych projektów do ręcznego pilnowania.

## Specyfikacja

| | |
|---|---|
| Rozdzielczość | 3840 × 2160 (4K UHD) |
| Długość | 10 s |
| Klatki | 25 fps — **zmień w `src/theme.ts`, jeśli timeline ma inne** |
| Tło | przezroczyste (kanał alfa) |
| Format dostawy | QuickTime ProRes 4444 |
| Czcionka | Fraunces (zmienna, wgrana lokalnie w `public/fonts`) |

## Plansze

| Kompozycja | Folder montażowy | Tekst |
|---|---|---|
| `Plansza1` | `1_Pan_pasterzem_jest` | Pan pasterzem jest |
| `Plansza2` | `2_Blogoslawmy_Panu` | Błogosławmy Panu |
| `Plansza3` | `3_Daje_ci_siebie` | Daję Ci siebie |
| `Plansza4` | `4_Uwielbiam_Cie` | Uwielbiam Cię |
| `Plansza5` | `5_W_obecnosci_chwaly_twej` | W obecności chwały Twej |

Każda ma bliźniaczkę z sufiksem `Proba` (np. `Plansza4Proba`) — to ta sama
animacja na ciemnym, ciepłym podkładzie. Służy wyłącznie do oceny czytelności
na ekranie; **do montażu bierzesz wersję bez `Proba`**, bo tylko ona ma alfę.

## Jak wyrenderować

Raz, na początku:

```bash
cd plansze
npm install
```

Podgląd na żywo w przeglądarce (suwak klatek, edycja tekstu):

```bash
npm run studio
```

Jedna plansza do montażu (ProRes 4444 z alfą):

```bash
npx remotion render Plansza4 out/04_Uwielbiam_Cie.mov \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le
```

Komplet pięciu:

```bash
for i in 1 2 3 4 5; do
  npx remotion render "Plansza$i" "out/plansza-$i.mov" \
    --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le
done
```

Pojedyncza klatka do oceny (PNG z alfą):

```bash
npx remotion still Plansza4 out/klatka.png --frame=150
```

## Jak wrzucić do DaVinci

1. Zaimportuj `.mov` do Media Pool.
2. Połóż go na ścieżce **wyżej** niż materiał (V2, jeśli film jest na V1).
3. Nic nie ustawiasz — alfa jest w pliku, kompozycja `Normal` wystarczy.
4. Jeśli plansza ma zakryć czarny start klipu, po prostu przesuń ją na początek.

Jeden plik na piosenkę, żadnych warstw do składania.

## Gdzie się co kręci

Wszystkie decyzje projektowe siedzą w `src/theme.ts`:

- `FPS` — dopasuj do timeline'u przed renderem
- `COLORS.title` / `COLORS.channel` — kolory
- `TYPE.titleSize` — rozmiar tytułu (jeden dla całego kompletu, żeby plansze
  trzymały się razem; przy 300 px najdłuższy tytuł jeszcze mieści się w kadrze)
- `TYPE.channelSize`, `TYPE.channelTop` — nazwa kanału i jej odległość od góry
- `ATMO.dustCount` — gęstość kurzu
- `ATMO.scratchCount` — liczba rys
- `ATMO.grain` — ziarno (0 wyłącza)
- `ATMO.flickerA` / `flickerB` — amplituda migotania

Tempo animacji: `src/Plansza.tsx`, sekcja „Obwiednie". Wejście tytułu, wejście
nazwy kanału i wygaszenie na końcu to trzy `interpolate` z czytelnymi czasami
w sekundach.

## Uwagi projektowe

- **Litery nie pulsują przezroczystością.** Tytuł wchodzi jako jedna bryła.
  Migotanie jest globalne i spokojne — to projektor, nie stroboskop.
- **MOCNI W DUCHU stoi nieruchomo.** Dryfuje wyłącznie tytuł, o kilkanaście
  pikseli w skali 4K, po gładkim szumie — bez schodków i bez poklatkowania.
- **Kurz i rysy są proceduralne, nie wektorowe.** Każdy pyłek to miękki gradient
  promienisty z rozmyciem, każda rysa ma nierówny profil wzdłuż długości.
  Wszystko ma obwiednię życia, więc nic nie wskakuje i nie znika nagle.
- **Nie ma ramki.** Ciepła poświata pod tytułem to halacja, nie obwódka —
  poprawia czytelność na jasnych ujęciach.
