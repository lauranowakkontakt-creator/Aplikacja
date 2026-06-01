// Font chooser page — Dusk skin, 3 font options side by side.

const FONT_KEYS = ["space", "manrope", "familjen"];

const FontComparePage = () => (
  <div style={{
    background: "#070709",
    minHeight: "100vh",
    color: "#ECEAF2",
    fontFamily: "'Manrope', sans-serif",
    paddingBottom: 100,
  }}>
    {/* Header */}
    <header style={{
      padding: "30px 40px",
      borderBottom: "1px solid rgba(223,225,243,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[DUSK_BASE.bg, DUSK_BASE.primary, DUSK_BASE.info, DUSK_BASE.text].map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: c, border: "1px solid rgba(223,225,243,0.14)" }} />
          ))}
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#62647A", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Dusk · cinema × indigo
        </span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
        Ta sama kolorystyka, trzy typografie
      </h1>
      <p style={{ fontSize: 14, color: "#979AB2", margin: "10px 0 0", maxWidth: 640, lineHeight: 1.5 }}>
        Hybryda Cinema + Indigo: brandowa terakota na chłodnej, indygowej bazie z barwinkiem jako akcentem. Wybierz font — przerobię na niego cały komplet ekranów.
      </p>
    </header>

    {/* Columns */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 32,
      padding: "40px",
      maxWidth: 1500,
    }}>
      {FONT_KEYS.map((fk, i) => {
        const t = DUSK_FONTS[`dusk_${fk}`];
        const meta = FONT_OPTIONS[fk];
        return (
          <div key={fk}>
            {/* Font label */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(223,225,243,0.08)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#62647A" }}>0{i + 1}</span>
                <span style={{ fontFamily: meta.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{meta.fontLabel}</span>
              </div>
              <div style={{ fontSize: 13, color: "#979AB2", marginTop: 4 }}>{meta.fontNote}</div>
              {/* Quick specimen */}
              <div style={{ fontFamily: meta.fontSans, marginTop: 14, lineHeight: 1.1 }}>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>Mój Świat</div>
                <div style={{ fontSize: 15, color: "#979AB2", marginTop: 2 }}>Budżet, nawyki, codzienność</div>
                <div style={{ fontFamily: meta.fontMono, fontSize: 12, color: "#62647A", marginTop: 8, letterSpacing: "0.04em" }}>
                  1 234,56 zł · LISTOPAD · 09:41
                </div>
              </div>
            </div>

            {/* Screen */}
            <Phone variant={`dusk_${fk}`} width={380} height={800} label={meta.fontLabel}>
              <TransactionsMobile t={t} />
            </Phone>
          </div>
        );
      })}
    </div>

    {/* Second row — habits, to show the font on a different layout */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 32,
      padding: "0 40px",
      maxWidth: 1500,
    }}>
      {FONT_KEYS.map((fk) => {
        const t = DUSK_FONTS[`dusk_${fk}`];
        const meta = FONT_OPTIONS[fk];
        return (
          <div key={fk}>
            <Phone variant={`dusk_${fk}`} width={380} height={800} label={`${meta.fontLabel} · nawyki`}>
              <HabitsTodayMobile t={t} />
            </Phone>
          </div>
        );
      })}
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<FontComparePage />);
