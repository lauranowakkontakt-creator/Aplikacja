// Design tokens for two variants of "Mój Świat"
// Variant A: "Terracotta" — refined evolution of current palette
// Variant B: "Sand" — warmer, more editorial, tan/khaki accents

const TOKENS = {
  A: {
    name: "Terracotta",
    tagline: "Warm minimal · refined dark",
    // Surfaces
    bg:       "#0B0A09",
    bg2:      "#13110F",
    surface:  "#181613",
    surface2: "#221F1B",
    border:   "#2B2722",
    borderStrong: "#3A3530",
    // Text
    text:     "#EFEAE2",
    textSub:  "#B8AEA1",
    textMute: "#6F665C",
    // Accents
    primary:  "#D9532A",     // refined terracotta
    primaryDeep: "#A8401E",
    primarySoft: "rgba(217,83,42,0.14)",
    income:   "#7FA882",     // sage
    expense:  "#D9532A",
    warn:     "#D4A24A",
    info:     "#6E8DB5",
    // Type
    fontSans: "'Geist', 'Söhne', -apple-system, sans-serif",
    fontMono: "'Geist Mono', 'JetBrains Mono', monospace",
    fontSerif: "'Instrument Serif', Georgia, serif",
    // Radii
    radiusSm: "8px",
    radius:   "12px",
    radiusLg: "20px",
  },
  B: {
    name: "Sand",
    tagline: "Warm tan · editorial dark",
    // Surfaces — warmer, browner
    bg:       "#14110D",
    bg2:      "#1B1712",
    surface:  "#221D17",
    surface2: "#2D2720",
    border:   "#3A332B",
    borderStrong: "#4A4239",
    // Text
    text:     "#F2EBDD",
    textSub:  "#BAAE99",
    textMute: "#7A6E5C",
    // Accents — tan/khaki direction
    primary:  "#D4A574",     // sand/tan
    primaryDeep: "#A07B4F",
    primarySoft: "rgba(212,165,116,0.14)",
    income:   "#A8B5A0",     // sage-cream
    expense:  "#C97A55",     // burnt
    warn:     "#E0B570",
    info:     "#9AAFB8",
    // Type — Newsreader serif + Geist sans/mono
    fontSans: "'Geist', -apple-system, 'Helvetica Neue', sans-serif",
    fontMono: "'Geist Mono', 'JetBrains Mono', monospace",
    fontSerif: "'Newsreader', 'Source Serif 4', Georgia, serif",
    // Radii — slightly larger for softer feel
    radiusSm: "10px",
    radius:   "14px",
    radiusLg: "22px",
  },
};

// Inject CSS variables for a variant scope
const TokenScope = ({ variant, children, style, className }) => {
  const t = TOKENS[variant];
  const cssVars = {
    "--bg": t.bg,
    "--bg2": t.bg2,
    "--surface": t.surface,
    "--surface2": t.surface2,
    "--border": t.border,
    "--border-strong": t.borderStrong,
    "--text": t.text,
    "--text-sub": t.textSub,
    "--text-mute": t.textMute,
    "--primary": t.primary,
    "--primary-deep": t.primaryDeep,
    "--primary-soft": t.primarySoft,
    "--income": t.income,
    "--expense": t.expense,
    "--warn": t.warn,
    "--info": t.info,
    "--font-sans": t.fontSans,
    "--font-mono": t.fontMono,
    "--font-serif": t.fontSerif,
    "--radius-sm": t.radiusSm,
    "--radius": t.radius,
    "--radius-lg": t.radiusLg,
  };
  return (
    <div
      className={className}
      style={{
        ...cssVars,
        background: t.bg,
        color: t.text,
        fontFamily: t.fontSans,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

Object.assign(window, { TOKENS, TokenScope });
