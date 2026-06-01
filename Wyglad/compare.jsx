// Comparison page — 4 colorways side by side on key screens.

const SKIN_ORDER = ["cinema", "paper", "indigo", "sage"];

const ComparePage = () => (
  <div style={{
    background: "#070707",
    minHeight: "100vh",
    color: "#EDEAE5",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 100,
  }}>
    {/* Header */}
    <header style={{
      padding: "28px 40px",
      borderBottom: "1px solid rgba(237,234,229,0.08)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#6A645C", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
          Mój Świat · szaty graficzne
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
          Cztery kierunki kolorystyczne
        </h1>
        <p style={{ fontSize: 14, color: "#9A938B", margin: "10px 0 0", maxWidth: 620, lineHeight: 1.5 }}>
          Każda szata na dwóch reprezentatywnych ekranach. Wspólny, spokojny system typografii: DM Sans w interfejsie, DM Mono w etykietach. Wybierz kierunek — dopracuję cały zestaw w jednym.
        </p>
      </div>
    </header>

    {/* Skins */}
    <div style={{ padding: "12px 40px 0" }}>
      {SKIN_ORDER.map((key, i) => {
        const t = SKINS[key];
        return (
          <section key={key} style={{
            padding: "44px 0",
            borderBottom: i < SKIN_ORDER.length - 1 ? "1px solid rgba(237,234,229,0.07)" : "none",
          }}>
            {/* Skin header */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 13,
                color: "#665F58",
                fontWeight: 500,
                width: 28,
              }}>
                0{i + 1}
              </div>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{t.name}</div>
                <div style={{ fontSize: 13, color: "#9A938B", marginTop: 2 }}>{t.tagline}</div>
              </div>
              {/* Swatches */}
              <div style={{ display: "flex", gap: 6 }}>
                {t.swatches.map((c, ci) => (
                  <div key={ci} style={{
                    width: 34, height: 34,
                    borderRadius: 8,
                    background: c,
                    border: "1px solid rgba(237,234,229,0.12)",
                  }} />
                ))}
              </div>
              <div style={{
                marginLeft: "auto",
                display: "flex",
                gap: 16,
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "#665F58",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                <span>bg {t.bg}</span>
                <span style={{ color: t.primary }}>● accent {t.primary}</span>
              </div>
            </div>

            {/* Screens */}
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
              <Phone variant={key} width={384} height={812} label="Budżet · transakcje">
                <TransactionsMobile t={t} />
              </Phone>
              <Phone variant={key} width={384} height={812} label="Nawyki · dziś">
                <HabitsTodayMobile t={t} />
              </Phone>
              <Phone variant={key} width={384} height={812} label="Modlitwa">
                <PrayerMobile t={t} />
              </Phone>
            </div>
          </section>
        );
      })}
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ComparePage />);
