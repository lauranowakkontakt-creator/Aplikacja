// Four colorway "skins" for Mój Świat — all share one clean type system:
//   UI:     DM Sans  (matches Laura's portfolio body font)
//   Labels: DM Mono  (small uppercase captions, amounts)
//   Display: DM Sans (no serif — kept calm, smaller)
// Each theme defines the full token contract used by the screens.

const FONTS = {
  fontSans:  "'DM Sans', -apple-system, 'Helvetica Neue', sans-serif",
  fontMono:  "'DM Mono', 'Geist Mono', monospace",
  fontSerif: "'DM Sans', -apple-system, sans-serif", // big numbers stay sans, clean
  radiusSm: "10px",
  radius:   "14px",
  radiusLg: "20px",
};

const SKINS = {
  // 1 · CINEMA — Laura's exact portfolio palette. Brand-true.
  cinema: {
    name: "Cinema",
    tagline: "Twój brand · głęboka czerń + terakota",
    swatches: ["#0A0908", "#C94B28", "#E05E38", "#EDEAE5"],
    bg: "#0A0908", bg2: "#100E0C", surface: "#16130F", surface2: "#1F1B16",
    border: "rgba(237,234,229,0.09)", borderStrong: "rgba(237,234,229,0.17)",
    text: "#EDEAE5", textSub: "#9A938B", textMute: "#665F58",
    primary: "#C94B28", primaryDeep: "#A23A1E", primarySoft: "rgba(201,75,40,0.15)",
    income: "#8AA888", expense: "#E05E38", warn: "#D4A24A", info: "#6E8DB5",
    ...FONTS,
  },

  // 2 · PAPER — light mode in the brand color. Warm, calm, editorial.
  paper: {
    name: "Paper",
    tagline: "Jasny · kremowy papier + terakota",
    swatches: ["#F4F0E8", "#FFFFFF", "#C94B28", "#1C1714"],
    bg: "#F0EBE2", bg2: "#E9E3D8", surface: "#FFFFFF", surface2: "#F8F4EC",
    border: "rgba(28,23,20,0.10)", borderStrong: "rgba(28,23,20,0.18)",
    text: "#1C1714", textSub: "#6B6056", textMute: "#9D9389",
    primary: "#C0481F", primaryDeep: "#9C3A18", primarySoft: "rgba(192,72,31,0.10)",
    income: "#5C7E55", expense: "#C0481F", warn: "#A9781F", info: "#4C6F95",
    ...FONTS,
  },

  // 3 · INDIGO — cool deep night, periwinkle accent. Modern, techy.
  indigo: {
    name: "Indigo",
    tagline: "Chłodna noc · indygo + barwinek",
    swatches: ["#0B0D16", "#6C7BF0", "#A78BFA", "#E7E9F5"],
    bg: "#0B0D16", bg2: "#11131F", surface: "#161A28", surface2: "#1F2435",
    border: "rgba(220,225,245,0.09)", borderStrong: "rgba(220,225,245,0.17)",
    text: "#E7E9F5", textSub: "#9298B5", textMute: "#5E6480",
    primary: "#6C7BF0", primaryDeep: "#5160D8", primarySoft: "rgba(108,123,240,0.16)",
    income: "#5FBF9B", expense: "#F0717E", warn: "#E2B15A", info: "#A78BFA",
    ...FONTS,
  },

  // 4 · SAGE — warm green-charcoal, olive/sage accent. Grounded, natural.
  sage: {
    name: "Sage",
    tagline: "Naturalna · zieleń lasu + szałwia",
    swatches: ["#0D110D", "#7FA86B", "#A8C08E", "#EAEDE3"],
    bg: "#0D110D", bg2: "#121712", surface: "#181E17", surface2: "#212820",
    border: "rgba(232,237,225,0.09)", borderStrong: "rgba(232,237,225,0.17)",
    text: "#EAEDE3", textSub: "#97A08C", textMute: "#626A5A",
    primary: "#7FA86B", primaryDeep: "#638A50", primarySoft: "rgba(127,168,107,0.15)",
    income: "#7FA86B", expense: "#D98A5C", warn: "#D6B24E", info: "#6E96A8",
    ...FONTS,
  },
};

// Merge into global TOKENS so the <Phone variant=...> frames can read them
window.TOKENS = Object.assign(window.TOKENS || {}, SKINS);
window.SKINS = SKINS;
