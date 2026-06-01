// Main app — Sand · restrained, minimal frame around the screens
// No hero, no big serif headlines, no decorative scrolling sections.
// Just a quiet index of the actual UI work.

const V = "dusk_space"; // Dusk skin · Space Grotesk

const t = TOKENS[V];

const App = () => (
  <div style={{
    background: "#0d0b08",
    minHeight: "100vh",
    color: t.text,
    fontFamily: t.fontSans,
    paddingBottom: 80,
  }}>
    {/* Compact header */}
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 16,
      padding: "20px clamp(16px, 4vw, 40px)",
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: t.primary, color: t.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconLogo size={15} stroke={1.8} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em" }}>Mój Świat</div>
        <div style={{
          fontFamily: t.fontMono, fontSize: 10, color: t.textMute,
          letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "2px 8px", border: `1px solid ${t.border}`, borderRadius: 99,
        }}>Dusk · v1</div>
      </div>
      <nav className="app-nav" style={{ display: "flex", flexWrap: "wrap", gap: 22, fontSize: 12, color: t.textMute }}>
        {[
          ["Fundamenty", "foundation"],
          ["Login",      "login"],
          ["Budżet",     "budget"],
          ["Nawyki",     "habits"],
          ["Nastrój",    "mood"],
          ["To-do",      "todo"],
          ["Kalendarz",  "calendar"],
          ["Modlitwa",   "prayer"],
          ["Ustawienia", "settings"],
        ].map(([label, anchor]) => (
          <a key={anchor} href={`#${anchor}`} style={{
            color: t.textSub,
            textDecoration: "none",
          }}>{label}</a>
        ))}
      </nav>
    </header>

    {/* Screen index */}
    <main style={{ padding: "40px clamp(16px, 4vw, 40px) 0" }}>

      <ModuleRow id="foundation" label="Fundamenty">
        <div style={{
          width: "100%",
          maxWidth: 1280,
          background: t.bg,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${t.border}`,
        }}>
          <FoundationSheet variant={V} />
        </div>
      </ModuleRow>

      <ModuleRow id="login" label="Logowanie">
        <Phone variant={V} width={390} height={820} label="Welcome">
          <LoginMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="budget" label="Budżet">
        <Phone variant={V} width={390} height={820} label="Transakcje">
          <TransactionsMobile t={t} />
        </Phone>
        <Phone variant={V} width={390} height={820} label="Dodaj wpis">
          <AddTransactionMobile t={t} />
        </Phone>
        <Phone variant={V} width={390} height={820} label="Konta">
          <AccountsMobile t={t} />
        </Phone>
        <Phone variant={V} width={390} height={820} label="Wykresy">
          <ChartsMobile t={t} />
        </Phone>
        <Desktop variant={V} width={1120} height={720} label="Transakcje · desktop">
          <TransactionsDesktop t={t} />
        </Desktop>
      </ModuleRow>

      <ModuleRow id="habits" label="Nawyki">
        <Phone variant={V} width={390} height={820} label="Tydzień">
          <HabitsWeekMobile t={t} />
        </Phone>
        <Phone variant={V} width={390} height={820} label="Dziś">
          <HabitsTodayMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="mood" label="Nastrój">
        <Phone variant={V} width={390} height={820} label="Picker">
          <MoodPickerMobile t={t} />
        </Phone>
        <Phone variant={V} width={390} height={820} label="Kalendarz">
          <MoodCalendarMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="todo" label="To-do">
        <Phone variant={V} width={390} height={820} label="Dom">
          <TodoMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="calendar" label="Kalendarz">
        <Phone variant={V} width={390} height={820} label="Listopad">
          <CalendarMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="prayer" label="Modlitwa">
        <Phone variant={V} width={390} height={820} label="Cisza wieczorna">
          <PrayerMobile t={t} />
        </Phone>
      </ModuleRow>

      <ModuleRow id="settings" label="Ustawienia">
        <Phone variant={V} width={390} height={820} label="Drawer">
          <SettingsDrawerMobile t={t} />
        </Phone>
      </ModuleRow>
    </main>
  </div>
);

const ModuleRow = ({ id, label, children }) => (
  <section id={id} data-screen-label={label} style={{ marginBottom: 56 }}>
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: 14,
      marginBottom: 20,
    }}>
      <h2 style={{
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        margin: 0,
        color: t.text,
      }}>{label}</h2>
      <div style={{
        flex: 1,
        height: 1,
        background: t.border,
      }} />
      <span style={{
        fontFamily: t.fontMono,
        fontSize: 10,
        color: t.textMute,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>{id}</span>
    </div>
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 28,
      alignItems: "flex-start",
      maxWidth: "100%",
      overflowX: "auto",
    }}>
      {children}
    </div>
  </section>
);

// === Login (kept compact, same as before but smaller hero text) ============

const LoginMobile = ({ t }) => (
  <div style={{ height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, display: "flex", flexDirection: "column", position: "relative" }}>
    <div style={{
      position: "absolute", inset: 0,
      background: `radial-gradient(ellipse at 50% 0%, ${t.primary}22 0%, transparent 55%)`,
      pointerEvents: "none",
    }} />

    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 28px 28px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: t.primary, color: t.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconLogo size={18} stroke={1.8} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>Mój Świat</div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <h1 style={{
          fontFamily: t.fontSerif,
          fontSize: 40,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          margin: 0,
          marginBottom: 12,
        }}>
          Pomyśl, zaplanuj, <em style={{ color: t.primary, fontStyle: "italic" }}>żyj.</em>
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: t.textSub, margin: 0, maxWidth: 280 }}>
          Twój budżet, nawyki, nastrój i plan dnia — w jednym miejscu.
        </p>
      </div>

      <div style={{ marginTop: 32 }}>
        <button style={{
          width: "100%",
          padding: "14px",
          borderRadius: t.radius,
          background: t.text,
          color: t.bg,
          border: "none",
          fontFamily: t.fontSans,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <IconGoogle size={16} />Kontynuuj z Google
        </button>

        <button style={{
          width: "100%",
          marginTop: 8,
          padding: "14px",
          borderRadius: t.radius,
          background: "transparent",
          color: t.textSub,
          border: `1px solid ${t.border}`,
          fontFamily: t.fontSans,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}>
          Załóż konto e-mailem
        </button>
      </div>
    </div>
  </div>
);

window.LoginMobile = LoginMobile;

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
