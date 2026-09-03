# Zależności — stan i decyzje

Notatka po to, żeby za pół roku nie zaczynać analizy od zera. Data przeglądu: **3 września 2026**.

## Co jest aktualizowane

| Paczka | Wersja | Najnowsza | Decyzja |
|---|---|---|---|
| firebase | 12.18.0 | 12.18.0 | aktualne |
| date-fns | 3.6.0 | 4.4.0 | **odłożone** — major |
| react / react-dom | 18.3.1 | 19.2.8 | **odłożone** — major |
| vite | 5.4.21 | 8.2.2 | **odłożone** — major |
| @vitejs/plugin-react | 4.7.0 | 6.1.1 | **odłożone** — idzie w parze z Vite |
| vite-plugin-pwa | 0.20.5 | 1.3.0 | **odłożone** — idzie w parze z Vite |

## Otwarte luki bezpieczeństwa

`npm audit` pokazuje 3 luki (2 moderate, 1 high). **Wszystkie w narzędziach
deweloperskich, żadna nie trafia do przeglądarki.**

Sedno: `esbuild <= 0.24.2` pozwala dowolnej stronie wysyłać zapytania do
serwera deweloperskiego i czytać odpowiedzi
([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)).
`vite` i `vite-plugin-pwa` są zgłaszane jako podatne wyłącznie dlatego, że
zależą od tego esbuilda.

Realny scenariusz ataku: masz uruchomione `npm run dev` **i** w tej samej
przeglądarce otwierasz złośliwą stronę. Wtedy ta strona może odpytać
Twój `localhost:5173`. Nic z tego nie dotyczy wersji wdrożonej — `dist/`
to statyczne pliki, bez serwera deweloperskiego.

Jedyna dostępna poprawka to Vite 8 (`npm audit fix --force`), czyli trzy
wersje major naraz, razem z pluginem React i PWA. To osobne zadanie
z własnym testowaniem, nie coś do doklejenia przy aktualizacji Firebase.

Do tego czasu: **nie zostawiaj `npm run dev` uruchomionego, gdy surfujesz
po nieznanych stronach.** To pełne ograniczenie ryzyka.

## Dlaczego CI nie blokuje na tych lukach

W [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) są dwa audyty:

- **blokujący** — `npm audit --omit=dev --audit-level=high`: luki w kodzie,
  który naprawdę ląduje w przeglądarce. Tu zero tolerancji.
- **informacyjny** — pełny `npm audit`: wypisuje wszystko łącznie z narzędziami,
  ale nie wywala builda.

Gdyby blokujący był pełnym audytem, CI świeciłby na czerwono od dnia zero przez
lukę w serwerze deweloperskim, której nie da się naprawić bez trzech majorów.
Czerwone CI, które zawsze jest czerwone, przestaje cokolwiek znaczyć — i wtedy
przepuszcza tę jedną lukę, na której naprawdę zależy.

## Kiedy wracać

Aktualizacje major mają sens jako osobne zadanie, w kolejności:

1. **Vite 8** (+ plugin-react 6, vite-plugin-pwa 1) — zamyka lukę w esbuild.
   Do sprawdzenia: konfiguracja PWA, `manualChunks`, `base: '/Aplikacja/'`.
2. **React 19** — apka nie używa `defaultProps` na komponentach funkcyjnych ani
   stringowych refów, więc powinno przejść gładko. Uwaga na `useSyncExternalStore`
   w `utils/polaczenie.js` i na `Suspense` przy leniwych modułach.
3. **date-fns 4** — głównie zmiany wokół stref czasowych. Apka trzyma daty jako
   `yyyy-MM-dd` i lokalne `Date`, więc ryzyko jest w formatowaniu na granicy dnia.

Po każdym: `npm run check` i przeklikanie [listy ręcznej](testy-reczne.md).
