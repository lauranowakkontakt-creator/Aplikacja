// Foundation / Style Guide artboards — one per variant
// Shows: brand mark, typography, color tokens, components, icon system

const FoundationSheet = ({ variant }) => {
  const t = TOKENS[variant];
  return (
    <TokenScope variant={variant} style={{ padding: "clamp(24px, 4vw, 48px)", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48, paddingBottom: 24, borderBottom: `1px solid ${t.border}` }}>
        <div>
          <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMute, textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>
            System · Mój Świat
          </div>
          <h1 style={{ fontFamily: t.fontSerif, fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", margin: 0 }}>
            {t.name}
          </h1>
          <div style={{ fontSize: 14, color: t.textSub, marginTop: 8 }}>{t.tagline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: t.primary,
            color: t.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconLogo size={28} stroke={1.5} />
          </div>
          <div>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, textTransform: "uppercase", letterSpacing: "0.12em" }}>Mark</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2 }}>mśw.</div>
          </div>
        </div>
      </div>

      <div className="found-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48 }}>
        {/* LEFT COLUMN */}
        <div>
          <SectionLabel t={t}>Typografia · Space Grotesk</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40 }}>
            <TypeRow t={t} size={48} family={t.fontSans} weight={600} name="Display · 600" sample="Mój świat" />
            <TypeRow t={t} size={32} family={t.fontSans} weight={600} name="Tytuł · 600" sample="Pomyśl, zaplanuj" />
            <TypeRow t={t} size={20} family={t.fontSans} weight={500} name="Podtytuł · 500" sample="Listopad 2026" />
            <TypeRow t={t} size={15} family={t.fontSans} weight={400} name="Tekst · 400" sample="Codzienne nawyki, transakcje, modlitwy. W jednym miejscu." />
            <TypeRow t={t} size={11} family={t.fontSans} weight={600} name="Etykieta · 600 · wersaliki" sample="Aktualizacja · 09:41 · listopad" upper />
          </div>

          <SectionLabel t={t}>Komponenty</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            <Card t={t} title="Pierwszorzędny">
              <Btn t={t} kind="primary">Zapisz</Btn>
              <Btn t={t} kind="primary" disabled>Zapisz</Btn>
            </Card>
            <Card t={t} title="Drugorzędny">
              <Btn t={t} kind="ghost">Anuluj</Btn>
              <Btn t={t} kind="outline">Edytuj</Btn>
            </Card>
            <Card t={t} title="Pola">
              <Input t={t} label="Kwota" value="240,00 zł" />
              <Input t={t} label="Opis" value="Lidl" />
            </Card>
            <Card t={t} title="Chipy / kategorie">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <Chip t={t} active>Jedzenie</Chip>
                <Chip t={t}>Transport</Chip>
                <Chip t={t}>Zakupy</Chip>
                <Chip t={t}>Dom</Chip>
              </div>
            </Card>
          </div>

          <SectionLabel t={t}>Stany danych</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <Tag t={t} kind="income">+ Przychód</Tag>
            <Tag t={t} kind="expense">– Wydatek</Tag>
            <Tag t={t} kind="info">Transfer</Tag>
            <Tag t={t} kind="warn">Przypomnienie</Tag>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <SectionLabel t={t}>Paleta</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 40 }}>
            <Swatch label="bg" value={t.bg} t={t} />
            <Swatch label="bg2" value={t.bg2} t={t} />
            <Swatch label="surface" value={t.surface} t={t} />
            <Swatch label="surface2" value={t.surface2} t={t} />
            <Swatch label="text" value={t.text} t={t} dark />
            <Swatch label="text-sub" value={t.textSub} t={t} dark />
            <Swatch label="text-mute" value={t.textMute} t={t} />
            <Swatch label="border" value={t.border} t={t} />
            <Swatch label="primary" value={t.primary} t={t} dark />
            <Swatch label="income" value={t.income} t={t} dark />
            <Swatch label="expense" value={t.expense} t={t} dark />
            <Swatch label="warn" value={t.warn} t={t} dark />
          </div>

          <SectionLabel t={t}>Ikony · system geometryczny</SectionLabel>
          <div className="icon-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 1,
            background: t.border,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            overflow: "hidden",
            marginBottom: 28,
          }}>
            {[
              [IconBudget, "bud\u017cet"], [IconHabits, "nawyki"], [IconMood, "nastr\u00f3j"], [IconTodo, "todo"],
              [IconCalendar, "kalend."], [IconPrayer, "modl."], [IconSettings, "ustaw."], [IconSearch, "szukaj"],
              [IconBell, "dzwon"], [IconPlus, "dodaj"], [IconCheck, "ptaszek"], [IconClose, "zamknij"],
              [IconEdit, "edytuj"], [IconTrash, "usu\u0144"], [IconEye, "podgl."], [IconTransfer, "przelew"],
              [IconArrowUp, "prz."], [IconArrowDown, "wyd."], [IconFlag, "flaga"], [IconClock, "czas"],
              [IconFlame, "seria"], [IconStar, "gwiazda"], [IconHeart, "serce"], [IconSparkle, "iskra"],
              [IconBank, "bank"], [IconCash, "got\u00f3wka"], [IconCard, "karta"], [IconSavings, "oszcz."],
              [IconFood, "jedz."], [IconTransport, "transp."], [IconShopping, "zakupy"], [IconHome, "dom"],
              [IconHealth, "zdrowie"], [IconWork, "praca"], [IconBills, "rach."], [IconGift, "prezent"],
              [IconFuel, "paliwo"], [IconCoffee, "kawa"], [IconEducation, "nauka"], [IconEntertainment, "rozr."],
            ].map(([Ico, name], i) => (
              <div key={i} style={{
                background: t.surface,
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                color: t.text,
                cursor: "pointer",
              }}>
                <Ico size={20} />
                <span style={{ fontFamily: t.fontSans, fontSize: 8, color: t.textMute, letterSpacing: "0.02em" }}>{name}</span>
              </div>
            ))}
          </div>

          <SectionLabel t={t}>Skala promieni</SectionLabel>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            {[
              ["sm", t.radiusSm],
              ["md", t.radius],
              ["lg", t.radiusLg],
            ].map(([n, r]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: r,
                }} />
                <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, marginTop: 6, letterSpacing: "0.06em" }}>{n} · {r}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TokenScope>
  );
};

// === Small atoms ===========================================================

const SectionLabel = ({ children, t }) => (
  <div style={{
    fontFamily: t.fontMono,
    fontSize: 10,
    color: t.textMute,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: `1px solid ${t.border}`,
  }}>
    {children}
  </div>
);

const TypeRow = ({ t, size, family, weight, name, sample, upper }) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 24, alignItems: "baseline" }}>
    <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: 8 }}>
      {name}
    </div>
    <div style={{
      fontFamily: family,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.1,
      letterSpacing: size > 30 ? "-0.02em" : 0,
      textTransform: upper ? "uppercase" : "none",
      color: t.text,
    }}>
      {sample}
    </div>
  </div>
);

const Card = ({ t, title, children }) => (
  <div style={{
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    padding: 14,
  }}>
    <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
  </div>
);

const Btn = ({ t, kind, disabled, children }) => {
  const styles = {
    primary: { background: t.primary, color: t.bg, border: "none" },
    outline: { background: "transparent", color: t.text, border: `1px solid ${t.border}` },
    ghost: { background: "transparent", color: t.textSub, border: "none" },
  };
  return (
    <button style={{
      ...styles[kind],
      padding: "9px 14px",
      borderRadius: t.radiusSm,
      fontFamily: t.fontSans,
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: "0.01em",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
      width: "100%",
      textAlign: "center",
    }}>
      {children}
    </button>
  );
};

const Input = ({ t, label, value }) => (
  <div style={{
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusSm,
    padding: "8px 12px",
  }}>
    <div style={{ fontFamily: t.fontMono, fontSize: 8, color: t.textMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginTop: 2 }}>{value}</div>
  </div>
);

const Chip = ({ t, active, children }) => (
  <span style={{
    padding: "5px 12px",
    borderRadius: 99,
    border: `1px solid ${active ? t.primary : t.border}`,
    background: active ? t.primarySoft : "transparent",
    color: active ? t.primary : t.textSub,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  }}>
    {children}
  </span>
);

const Tag = ({ t, kind, children }) => {
  const palette = {
    income:  { fg: t.income,  bg: "transparent", bd: t.income },
    expense: { fg: t.expense, bg: "transparent", bd: t.expense },
    info:    { fg: t.info,    bg: "transparent", bd: t.info },
    warn:    { fg: t.warn,    bg: "transparent", bd: t.warn },
  }[kind];
  return (
    <span style={{
      padding: "5px 10px",
      borderRadius: 99,
      border: `1px solid ${palette.bd}40`,
      background: palette.bg,
      color: palette.fg,
      fontFamily: t.fontMono,
      fontSize: 10,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      fontWeight: 600,
    }}>{children}</span>
  );
};

const Swatch = ({ label, value, t, dark }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{
      height: 56,
      background: value,
      borderRadius: t.radiusSm,
      border: `1px solid ${t.border}`,
    }} />
    <div>
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.text, letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontFamily: t.fontMono, fontSize: 8, color: t.textMute, letterSpacing: "0.04em", textTransform: "uppercase" }}>{value}</div>
    </div>
  </div>
);

Object.assign(window, { FoundationSheet });
