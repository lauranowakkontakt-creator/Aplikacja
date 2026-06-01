// Lightweight device frames used inside design canvas artboards
// Both render their children inside a clipped viewport, no chrome animations

const Phone = ({ children, variant, width = 390, height = 844, label, style }) => {
  const t = TOKENS[variant];
  return (
    <div style={{
      width: width + 24,
      padding: 12,
      display: "inline-block",
      ...style,
    }}>
      {label && (
        <div style={{
          fontFamily: t.fontMono,
          fontSize: 10,
          color: "#5a5a5a",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <div style={{
        width,
        height,
        background: t.bg,
        borderRadius: 44,
        padding: 10,
        boxShadow: "0 0 0 2px #1c1c1c, 0 30px 60px -20px rgba(0,0,0,0.6)",
        position: "relative",
      }}>
        <div style={{
          width: "100%",
          height: "100%",
          borderRadius: 34,
          overflow: "hidden",
          background: t.bg,
          position: "relative",
          color: t.text,
          fontFamily: t.fontSans,
        }}>
          {/* Status bar */}
          <div style={{
            height: 44,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "0 26px 8px",
            fontFamily: t.fontSans,
            fontSize: 14,
            fontWeight: 600,
            color: t.text,
            position: "relative",
            zIndex: 5,
          }}>
            <span>9:41</span>
            <div style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 100,
              height: 28,
              background: "#000",
              borderRadius: 16,
            }} />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
                <rect x="1" y="6" width="2" height="4" rx="0.5" />
                <rect x="5" y="4" width="2" height="6" rx="0.5" />
                <rect x="9" y="2" width="2" height="8" rx="0.5" />
                <rect x="13" y="0" width="2" height="10" rx="0.5" />
              </svg>
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
                <rect x="0.5" y="0.5" width="18" height="9" rx="2" />
                <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
                <path d="M20 3.5v3" />
              </svg>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

const Desktop = ({ children, variant, width = 1100, height = 720, label, style }) => {
  const t = TOKENS[variant];
  return (
    <div style={{
      width: width + 24,
      padding: 12,
      display: "inline-block",
      ...style,
    }}>
      {label && (
        <div style={{
          fontFamily: t.fontMono,
          fontSize: 10,
          color: "#5a5a5a",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <div style={{
        width,
        height,
        background: t.bg,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 0 0 1px #1c1c1c, 0 30px 60px -20px rgba(0,0,0,0.6)",
        position: "relative",
        color: t.text,
        fontFamily: t.fontSans,
      }}>
        {/* Browser-like chrome */}
        <div style={{
          height: 34,
          background: t.bg2,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 8,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#3a3a3a" }} />
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#3a3a3a" }} />
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#3a3a3a" }} />
          </div>
          <div style={{
            flex: 1,
            textAlign: "center",
            fontSize: 11,
            fontFamily: t.fontMono,
            color: t.textMute,
            letterSpacing: "0.04em",
          }}>
            mojswiat.app
          </div>
        </div>
        <div style={{ height: height - 34, overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Phone, Desktop });
