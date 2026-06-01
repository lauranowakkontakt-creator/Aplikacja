// "Dusk" — hybrid skin: Cinema terracotta on an indigo-tinted dark base,
// with periwinkle as the cool secondary accent.
// Shown in THREE font options so the font can be chosen holding color constant.

const DUSK_BASE = {
  tagline: "Cinema × Indigo · terakota na indygo",
  // indigo-tinted warm dark
  bg: "#0B0C12", bg2: "#11131C", surface: "#161825", surface2: "#1F2230",
  border: "rgba(223,225,243,0.09)", borderStrong: "rgba(223,225,243,0.17)",
  text: "#ECEAF2", textSub: "#979AB2", textMute: "#5F627A",
  // brand terracotta primary, periwinkle as info/secondary
  primary: "#D2552E", primaryDeep: "#A8401E", primarySoft: "rgba(210,85,46,0.16)",
  income: "#62C39C", expense: "#E0653C", warn: "#E0B15A", info: "#7C8AF0",
  radiusSm: "10px", radius: "14px", radiusLg: "20px",
};

const FONT_OPTIONS = {
  space: {
    fontLabel: "Space Grotesk",
    fontNote: "wyrazisty, świetne cyfry, lekko techniczny charakter",
    fontSans: "'Space Grotesk', -apple-system, sans-serif",
    fontSerif: "'Space Grotesk', sans-serif",
    fontMono: "'Space Grotesk', sans-serif",
  },
  manrope: {
    fontLabel: "Manrope",
    fontNote: "miękki, nowoczesny, bardzo czysty",
    fontSans: "'Manrope', -apple-system, sans-serif",
    fontSerif: "'Manrope', sans-serif",
    fontMono: "'Manrope', sans-serif",
  },
  familjen: {
    fontLabel: "Familjen Grotesk",
    fontNote: "skandynawski, z charakterem, lekko zwężony",
    fontSans: "'Familjen Grotesk', -apple-system, sans-serif",
    fontSerif: "'Familjen Grotesk', sans-serif",
    fontMono: "'Familjen Grotesk', sans-serif",
  },
};

const DUSK_FONTS = {};
Object.entries(FONT_OPTIONS).forEach(([key, fonts]) => {
  DUSK_FONTS[`dusk_${key}`] = {
    name: "Dusk",
    ...DUSK_BASE,
    ...fonts,
  };
});

window.TOKENS = Object.assign(window.TOKENS || {}, DUSK_FONTS);
window.DUSK_FONTS = DUSK_FONTS;
window.FONT_OPTIONS = FONT_OPTIONS;
window.DUSK_BASE = DUSK_BASE;
