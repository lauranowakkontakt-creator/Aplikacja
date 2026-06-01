// Shared shell pieces used by every screen — mobile header, bottom nav, desktop sidebar

const MODULES = [
  { id: "budget",   label: "Budżet",    Icon: () => <IconBudget /> },
  { id: "habits",   label: "Nawyki",    Icon: () => <IconHabits /> },
  { id: "todo",     label: "To-do",     Icon: () => <IconTodo /> },
  { id: "calendar", label: "Kalendarz", Icon: () => <IconCalendar /> },
  { id: "prayer",   label: "Modlitwa",  Icon: () => <IconPrayer /> },
];

const MobileHeader = ({ t, title, kicker, right, sticky = true }) => (
  <div style={{
    padding: "10px 20px 14px",
    borderBottom: `1px solid ${t.border}`,
    background: t.bg,
    position: sticky ? "sticky" : "static",
    top: 0,
    zIndex: 5,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        {kicker && (
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            {kicker}
          </div>
        )}
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 2 }}>
          {title}
        </div>
      </div>
      {right}
    </div>
  </div>
);

const HeaderIcon = ({ t, children, onClick }) => (
  <button onClick={onClick} style={{
    width: 36, height: 36,
    borderRadius: 10,
    background: t.surface,
    border: `1px solid ${t.border}`,
    color: t.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  }}>
    {children}
  </button>
);

const BottomNav = ({ t, active }) => {
  const [cur, setCur] = React.useState(active);
  const curIdx = MODULES.findIndex(x => x.id === cur);
  return (
  <div style={{
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    background: t.bg2,
    borderTop: `1px solid ${t.border}`,
    display: "flex",
    padding: "10px 4px 28px",
    zIndex: 4,
  }}>
    {/* Sliding active indicator */}
    <div style={{
      position: "absolute",
      top: 0,
      left: `calc(${(curIdx + 0.5) * (100 / MODULES.length)}% - 15px)`,
      width: 30, height: 2,
      background: t.primary,
      borderRadius: "0 0 2px 2px",
      transition: "left 0.34s cubic-bezier(0.4, 0, 0.2, 1)",
    }} />
    {MODULES.map((m) => {
      const isActive = cur === m.id;
      return (
        <div key={m.id} onClick={() => setCur(m.id)} style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: isActive ? t.primary : t.textMute,
          cursor: "pointer",
          transition: "color 0.28s ease",
        }}>
          <span style={{
            display: "flex",
            transition: "transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)",
            transform: isActive ? "translateY(-1px) scale(1.12)" : "none",
          }}>
            <m.Icon />
          </span>
          <span style={{
            fontSize: 9.5,
            fontFamily: t.fontMono,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: isActive ? 600 : 400,
            transition: "font-weight 0.2s ease",
          }}>
            {m.label}
          </span>
        </div>
      );
    })}
  </div>
  );
};

// Desktop sidebar — left rail
const DesktopShell = ({ t, active, children, title }) => (
  <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans }}>
    {/* Left rail */}
    <aside style={{
      width: 240,
      borderRight: `1px solid ${t.border}`,
      background: t.bg2,
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 32 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: t.primary, color: t.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconLogo size={16} stroke={1.8} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1 }}>Mój Świat</div>
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>laura</div>
        </div>
      </div>
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0 8px", marginBottom: 8 }}>Moduły</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {MODULES.map(m => {
          const isActive = active === m.id;
          return (
            <div key={m.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 10px",
              borderRadius: t.radiusSm,
              background: isActive ? t.primarySoft : "transparent",
              color: isActive ? t.primary : t.textSub,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
            }}>
              <m.Icon />
              <span style={{ flex: 1 }}>{m.label}</span>
              {isActive && <div style={{ width: 4, height: 4, background: t.primary, borderRadius: 2 }} />}
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: "12px 8px", display: "flex", alignItems: "center", gap: 10, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 99, background: t.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: t.textSub }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Laura</div>
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.04em" }}>laura@mail.com</div>
        </div>
        <IconSettings size={16} style={{ color: t.textMute }} />
      </div>
    </aside>

    {/* Main */}
    <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        height: 60,
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.1em", textTransform: "uppercase" }}>· laura</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 12px",
            border: `1px solid ${t.border}`,
            borderRadius: t.radiusSm,
            color: t.textMute,
            fontSize: 12,
            width: 220,
          }}>
            <IconSearch size={14} />
            <span style={{ fontFamily: t.fontMono, letterSpacing: "0.04em" }}>szukaj…</span>
            <span style={{ marginLeft: "auto", fontFamily: t.fontMono, fontSize: 10, padding: "2px 5px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 4 }}>⌘K</span>
          </div>
          <HeaderIcon t={t}><IconBell size={16} /></HeaderIcon>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </main>
  </div>
);

// Pretty currency formatter
const PLN = (n) => {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${abs} zł`;
};

Object.assign(window, { MODULES, MobileHeader, HeaderIcon, BottomNav, DesktopShell, PLN });
