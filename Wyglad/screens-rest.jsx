// Habits, Mood, Todo, Calendar, Prayer screens (mobile)
// Plus Settings Drawer
// All take `t` (token object) — call from inside <TokenScope variant=...>

const WEEK_DAYS = ["P", "W", "Ś", "C", "P", "S", "N"];

// === HABITS — Tydzień view ================================================

const HABITS_DATA = [
  { name: "Modlitwa poranna", cat: "Duchowość", streak: 47, done: [1,1,1,1,1,0,0], Icon: IconPrayer, color: "#D9532A" },
  { name: "Czytanie 30 min", cat: "Rozwój",     streak: 12, done: [1,1,0,1,1,1,0], Icon: IconEducation, color: "#6E8DB5" },
  { name: "Ćwiczenia",       cat: "Zdrowie",   streak: 5,  done: [0,1,1,1,1,0,0], Icon: IconHealth, color: "#7FA882" },
  { name: "Bez ekranów po 22", cat: "Sen",     streak: 21, done: [1,1,1,1,0,1,0], Icon: IconMood, color: "#D4A574" },
  { name: "Dziennik wieczorny", cat: "Refleksja", streak: 8, done: [1,0,1,1,1,1,0], Icon: IconTodo, color: "#A07B4F" },
];

const HabitsWeekMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Nawyki" title="Tydzień 47" right={
      <div style={{ display: "flex", gap: 6 }}>
        <HeaderIcon t={t}><IconSparkle size={14} /></HeaderIcon>
        <HeaderIcon t={t}><IconPlus size={16} /></HeaderIcon>
      </div>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Top stat */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>Konsekwencja</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
              <span style={{ fontFamily: t.fontSerif, fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em" }}>74</span>
              <span style={{ fontFamily: t.fontSerif, fontSize: 18, fontWeight: 500, color: t.textMute }}>%</span>
              <span style={{ fontSize: 11, color: t.income, marginLeft: 6, fontWeight: 500 }}>↑ 8% vs. ubiegły</span>
            </div>
          </div>
          <div style={{
            width: 56, height: 56,
            borderRadius: 14,
            background: t.primarySoft,
            border: `1px solid ${t.primary}40`,
            color: t.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <IconFlame size={22} />
            <div style={{
              position: "absolute",
              bottom: -6, right: -6,
              background: t.primary,
              color: t.bg,
              fontSize: 10,
              fontFamily: t.fontMono,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 6,
              letterSpacing: "0.02em",
            }}>47</div>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ padding: "16px 20px 0" }}>
        <SegTabs t={t} active="week" items={[
          { id: "today", label: "Dziś" },
          { id: "week",  label: "Tydzień" },
          { id: "month", label: "Miesiąc" },
          { id: "stats", label: "Statystyki" },
        ]} />
      </div>

      {/* Week header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          overflow: "hidden",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr repeat(7, 32px)",
            gap: 4,
            padding: "12px 16px",
            borderBottom: `1px solid ${t.border}`,
            alignItems: "center",
          }}>
            <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.1em", textTransform: "uppercase" }}>Nawyk</div>
            {[18, 19, 20, 21, 22, 23, 24].map((d, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                color: i === 4 ? t.primary : t.textMute,
                fontFamily: t.fontMono,
              }}>
                <span style={{ fontSize: 8, letterSpacing: "0.04em" }}>{WEEK_DAYS[i]}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: i === 4 ? 700 : 500,
                  width: i === 4 ? 22 : "auto",
                  height: i === 4 ? 22 : "auto",
                  background: i === 4 ? t.primary : "transparent",
                  color: i === 4 ? t.bg : t.text,
                  borderRadius: 99,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{d}</span>
              </div>
            ))}
          </div>

          {HABITS_DATA.map((h, ri) => (
            <div key={ri} style={{
              display: "grid",
              gridTemplateColumns: "1fr repeat(7, 32px)",
              gap: 4,
              padding: "12px 16px",
              borderBottom: ri < HABITS_DATA.length - 1 ? `1px solid ${t.border}` : "none",
              alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30,
                  borderRadius: 9,
                  background: `${h.color}1A`,
                  border: `1px solid ${h.color}40`,
                  color: h.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <h.Icon size={14} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div>
                  <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.04em", marginTop: 1 }}>{h.streak}d · {h.cat}</div>
                </div>
              </div>
              {h.done.map((d, di) => (
                <div key={di} style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: d ? h.color : "transparent",
                  border: `1px solid ${d ? h.color : t.border}`,
                  color: t.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: di > 4 ? 0.3 : 1,
                }}>
                  {d ? <IconCheck size={14} stroke={2.5} /> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Add new habit */}
      <div style={{ padding: "16px 20px 0" }}>
        <button style={{
          background: "transparent",
          border: `1px dashed ${t.border}`,
          borderRadius: t.radius,
          padding: 14,
          color: t.textMute,
          fontSize: 13,
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: "pointer",
        }}>
          <IconPlus size={14} />Nowy nawyk
        </button>
      </div>
    </div>

    <BottomNav t={t} active="habits" />
  </div>
);

// === HABITS — Dziś view ===================================================

const HabitsTodayMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Nawyki · Dziś" title="Wtorek, 25 lis" right={
      <HeaderIcon t={t}><IconPlus size={16} /></HeaderIcon>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Day strip */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
          {[
            { d: 18, lbl: "P" }, { d: 19, lbl: "W" }, { d: 20, lbl: "Ś" },
            { d: 21, lbl: "C" }, { d: 22, lbl: "P", active: true }, { d: 23, lbl: "S" }, { d: 24, lbl: "N" },
          ].map((d, i) => (
            <div key={i} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 4px",
              borderRadius: 14,
              background: d.active ? t.primary : "transparent",
              border: `1px solid ${d.active ? t.primary : t.border}`,
              color: d.active ? t.bg : t.text,
            }}>
              <span style={{ fontSize: 9, fontFamily: t.fontMono, letterSpacing: "0.04em", opacity: 0.7 }}>{d.lbl}</span>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{d.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress headline */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          Postęp dnia
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: t.fontSerif, fontSize: 44, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em" }}>3</span>
          <span style={{ fontFamily: t.fontMono, fontSize: 18, color: t.textMute }}>/ 5</span>
          <span style={{ fontSize: 12, color: t.textSub, marginLeft: 8 }}>zostały 2 nawyki</span>
        </div>
        <div style={{ height: 3, background: t.surface, borderRadius: 2, overflow: "hidden", marginTop: 12 }}>
          <div style={{ width: "60%", height: "100%", background: t.income }} />
        </div>
      </div>

      {/* Today cards */}
      <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {HABITS_DATA.map((h, i) => {
          const done = i < 3;
          return (
            <div key={i} style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radius,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: done ? 0.6 : 1,
              cursor: "pointer",
            }}>
              <div style={{
                width: 44, height: 44,
                borderRadius: 13,
                background: `${h.color}1A`,
                border: `1px solid ${h.color}40`,
                color: h.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <h.Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, textDecoration: done ? "line-through" : "none", textDecorationColor: t.textMute }}>{h.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <IconFlame size={11} style={{ color: t.primary }} />
                  <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.primary, letterSpacing: "0.04em" }}>{h.streak} dni</span>
                  <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.04em", textTransform: "uppercase" }}>· {h.cat}</span>
                </div>
              </div>
              <button style={{
                width: 36, height: 36,
                borderRadius: 99,
                background: done ? h.color : "transparent",
                border: `2px solid ${done ? h.color : t.border}`,
                color: done ? t.bg : t.text,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                {done && <IconCheck size={16} stroke={3} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>

    <BottomNav t={t} active="habits" />
  </div>
);

// === MOOD — Picker + Calendar combined ====================================

const MOOD_OPTIONS = [
  { val: 1, label: "okropny", color: "#C97A55" },
  { val: 2, label: "źle",     color: "#D49B6E" },
  { val: 3, label: "ok",      color: "#D4A574" },
  { val: 4, label: "dobrze",  color: "#A8B5A0" },
  { val: 5, label: "świetnie", color: "#7FA882" },
];

const EMOTIONS = ["spokój", "wdzięczność", "radość", "ciekawość", "miłość", "zmęczenie", "frustracja", "lęk", "smutek", "duma", "ulga"];

const MoodPickerMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Nastrój" title="Jak się masz?" right={
      <HeaderIcon t={t}><IconCalendar size={16} /></HeaderIcon>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Week strip */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            { d: 18, mood: 4 }, { d: 19, mood: 3 }, { d: 20, mood: 5 },
            { d: 21, mood: 4 }, { d: 22, mood: null, today: true }, { d: 23, mood: null }, { d: 24, mood: null },
          ].map((day, i) => {
            const m = MOOD_OPTIONS.find(o => o.val === day.mood);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
                <span style={{ fontSize: 9, color: t.textMute, fontFamily: t.fontMono, letterSpacing: "0.04em" }}>{WEEK_DAYS[i]}</span>
                <div style={{
                  width: 28, height: 28,
                  borderRadius: 9,
                  background: m ? m.color : "transparent",
                  border: `1px solid ${m ? m.color : day.today ? t.primary : t.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: m ? t.bg : t.textMute,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: t.fontMono,
                }}>
                  {day.d}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood picker */}
      <div style={{ padding: "28px 20px 0" }}>
        <FieldLabel t={t}>Twój nastrój teraz</FieldLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {MOOD_OPTIONS.map((o, i) => {
            const active = i === 2;
            return (
              <div key={i} style={{
                flex: 1,
                background: t.surface,
                border: `1px solid ${active ? o.color : t.border}`,
                borderRadius: 14,
                padding: "16px 4px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                position: "relative",
                cursor: "pointer",
              }}>
                <MoodMark t={t} val={o.val} color={o.color} active={active} />
                <span style={{
                  fontSize: 9.5,
                  color: active ? t.text : t.textMute,
                  fontWeight: active ? 600 : 400,
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}>{o.label}</span>
                {active && (
                  <div style={{
                    position: "absolute",
                    top: -1, right: -1,
                    width: 8, height: 8,
                    background: o.color,
                    borderRadius: "0 14px 0 0",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Emotions */}
      <div style={{ padding: "24px 20px 0" }}>
        <FieldLabel t={t}>Emocje · wybierz kilka</FieldLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EMOTIONS.map((e, i) => (
            <span key={e} style={{
              padding: "6px 12px",
              borderRadius: 99,
              border: `1px solid ${[0, 1].includes(i) ? t.primary : t.border}`,
              background: [0, 1].includes(i) ? t.primarySoft : "transparent",
              color: [0, 1].includes(i) ? t.primary : t.textSub,
              fontSize: 12,
              fontWeight: [0, 1].includes(i) ? 600 : 400,
              cursor: "pointer",
            }}>{e}</span>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{ padding: "24px 20px 20px" }}>
        <FieldLabel t={t}>Notatka</FieldLabel>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: "12px 14px",
          minHeight: 80,
          fontSize: 13,
          color: t.textSub,
          fontStyle: "italic",
          lineHeight: 1.5,
        }}>
          "Spokojny dzień. Spacer po lesie zrobił swoje, ale czuję, że potrzebuję się jeszcze wyspać."
        </div>

        <button style={{
          width: "100%",
          marginTop: 14,
          padding: "14px",
          borderRadius: t.radius,
          background: t.primary,
          color: t.bg,
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.02em",
          cursor: "pointer",
        }}>
          Zapisz nastrój
        </button>
      </div>
    </div>

    <BottomNav t={t} active="todo" />
  </div>
);

// Geometric mood marks (no faces, abstract intensity)
const MoodMark = ({ t, val, color, active }) => {
  const size = 28;
  // val 1..5 — angle of arc, darker to brighter
  const shapes = {
    1: <path d="M5 20c2-3 6-5 9-5s7 2 9 5" />,
    2: <path d="M5 17c2-2 6-3 9-3s7 1 9 3" />,
    3: <path d="M5 14h18" />,
    4: <path d="M5 11c2 2 6 3 9 3s7-1 9-3" />,
    5: <path d="M5 8c2 3 6 5 9 5s7-2 9-5" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={active ? color : t.textMute} strokeWidth={2.2} strokeLinecap="round">
      <circle cx="9.5" cy="10" r="1.2" fill={active ? color : t.textMute} stroke="none" />
      <circle cx="18.5" cy="10" r="1.2" fill={active ? color : t.textMute} stroke="none" />
      {shapes[val]}
    </svg>
  );
};

const MoodCalendarMobile = ({ t }) => {
  const days = [];
  // 30 days, fake moods
  const moodFor = (d) => {
    if (d > 25) return null;
    const seed = [3, 4, 3, 5, 4, 2, 3, 4, 4, 5, 3, 4, 5, 5, 4, 3, 4, 5, 4, 3, 4, 5, 5, 4, null][d - 1];
    return seed;
  };
  for (let d = 1; d <= 30; d++) days.push({ d, mood: moodFor(d) });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
      <MobileHeader t={t} kicker="Nastrój · Kalendarz" title="Listopad" right={
        <div style={{ display: "flex", gap: 6 }}>
          <button style={iconBtn(t)}><IconChevronLeft size={14} /></button>
          <button style={iconBtn(t)}><IconChevronRight size={14} /></button>
        </div>
      } />

      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
        {/* Average + trend */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radiusLg,
            padding: 20,
            display: "flex",
            gap: 18,
            alignItems: "center",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>Średnia · listopad</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: t.fontSerif, fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>3,9</span>
                <span style={{ fontFamily: t.fontMono, fontSize: 14, color: t.textMute }}>/ 5</span>
              </div>
              <div style={{ fontSize: 11, color: t.income, marginTop: 4 }}>↑ 0,3 vs. październik</div>
            </div>
            <MoodMark t={t} val={4} color={t.income} active />
          </div>
        </div>

        {/* Calendar */}
        <div style={{ padding: "20px 20px 0" }}>
          <FieldLabel t={t}>Miesiąc</FieldLabel>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: 12,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {WEEK_DAYS.map((d, i) => (
                <div key={i} style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, textAlign: "center", padding: "4px 0", letterSpacing: "0.04em" }}>{d}</div>
              ))}
              {/* Offset for month start (Saturday = idx 5) */}
              {Array.from({ length: 5 }).map((_, i) => <div key={`b${i}`} />)}
              {days.map(({ d, mood }) => {
                const m = MOOD_OPTIONS.find(o => o.val === mood);
                const isToday = d === 22;
                return (
                  <div key={d} style={{
                    aspectRatio: 1,
                    background: m ? `${m.color}33` : "transparent",
                    border: `1px solid ${isToday ? t.primary : m ? `${m.color}50` : "transparent"}`,
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: 2,
                  }}>
                    <span style={{ fontFamily: t.fontMono, fontSize: 9, color: m ? t.text : t.textMute, fontWeight: isToday ? 700 : 400 }}>{d}</span>
                    {m && <div style={{ width: 12, height: 3, background: m.color, borderRadius: 2 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div style={{ padding: "20px 20px 0" }}>
          <FieldLabel t={t}>21 listopada · piątek</FieldLabel>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderLeft: `3px solid ${MOOD_OPTIONS[3].color}`,
            borderRadius: t.radius,
            padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <MoodMark t={t} val={4} color={MOOD_OPTIONS[3].color} active />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Dobrze</div>
                <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.04em" }}>21:42</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {["spokój", "wdzięczność", "duma"].map(e => (
                <span key={e} style={{ fontSize: 11, padding: "3px 9px", background: t.bg, color: t.textSub, borderRadius: 99 }}>{e}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: t.textSub, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
              "Skończyłam projekt z pracy. W końcu wieczór sama z herbatą i książką."
            </p>
          </div>
        </div>
      </div>

      <BottomNav t={t} active="todo" />
    </div>
  );
};

// === TODO =================================================================

const TODO_LISTS = [
  { id: "home", name: "Dom", count: 5, active: true },
  { id: "work", name: "Praca", count: 12 },
  { id: "shop", name: "Zakupy", count: 3 },
  { id: "ideas", name: "Pomysły", count: 8 },
];

const TODOS = [
  { name: "Zamówić nowy filtr do oczyszczacza", done: false, priority: "high", due: "Dziś" },
  { name: "Wymienić ręczniki w łazience", done: false, priority: null, due: null },
  { name: "Polać kwiaty", done: true, priority: null, due: null },
  { name: "Umówić wizytę u dentysty", done: false, priority: "med", due: "Jutro" },
  { name: "Posprzątać biurko przed weekendem", done: false, priority: null, due: "pt" },
  { name: "Wynieść śmieci", done: true, priority: null, due: null },
];

const TodoMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="To-do" title="Dom" right={
      <div style={{ display: "flex", gap: 6 }}>
        <HeaderIcon t={t}><IconSearch size={14} /></HeaderIcon>
        <HeaderIcon t={t}><IconMore size={14} /></HeaderIcon>
      </div>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 110 }}>
      {/* Lists chips */}
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 6, overflowX: "auto" }}>
        {TODO_LISTS.map(l => (
          <div key={l.id} style={{
            padding: "6px 12px",
            borderRadius: 99,
            border: `1px solid ${l.active ? t.primary : t.border}`,
            background: l.active ? t.primarySoft : "transparent",
            color: l.active ? t.primary : t.textSub,
            fontSize: 12,
            fontWeight: l.active ? 600 : 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}>
            {l.name}
            <span style={{
              fontSize: 9,
              fontFamily: t.fontMono,
              padding: "1px 5px",
              background: l.active ? t.primary : t.surface,
              color: l.active ? t.bg : t.textMute,
              borderRadius: 99,
              fontWeight: 700,
            }}>{l.count}</span>
          </div>
        ))}
        <div style={{
          padding: "6px 12px",
          borderRadius: 99,
          border: `1px dashed ${t.border}`,
          color: t.textMute,
          fontSize: 11,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <IconPlus size={12} />Lista
        </div>
      </div>

      {/* Today's count */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 11,
            background: t.primarySoft,
            color: t.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconFlag size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>2 zadania na dziś</div>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.04em", marginTop: 2 }}>1 z priorytetem · 1 standardowe</div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        <FieldLabel t={t}>Aktywne</FieldLabel>
        {TODOS.filter(t => !t.done).map((todo, i) => (
          <div key={i} style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}>
            <div style={{
              width: 22, height: 22,
              borderRadius: 7,
              border: `1.5px solid ${t.border}`,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{todo.name}</div>
              {(todo.due || todo.priority) && (
                <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                  {todo.priority && (
                    <span style={{
                      fontSize: 9,
                      fontFamily: t.fontMono,
                      padding: "1px 6px",
                      background: todo.priority === "high" ? `${t.expense}26` : `${t.warn}26`,
                      color: todo.priority === "high" ? t.expense : t.warn,
                      borderRadius: 4,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}>{todo.priority === "high" ? "wysoki" : "średni"}</span>
                  )}
                  {todo.due && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: t.textMute }}>
                      <IconClock size={11} />{todo.due}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button style={{
              width: 24, height: 24,
              background: "transparent",
              border: "none",
              color: t.textMute,
              cursor: "pointer",
            }}>
              <IconMore size={14} />
            </button>
          </div>
        ))}

        <div style={{ height: 8 }} />
        <FieldLabel t={t}>Zrobione · 2</FieldLabel>
        {TODOS.filter(t => t.done).map((todo, i) => (
          <div key={i} style={{
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: 0.5,
          }}>
            <div style={{
              width: 22, height: 22,
              borderRadius: 7,
              background: t.income,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              color: t.bg,
            }}>
              <IconCheck size={12} stroke={3} />
            </div>
            <div style={{ flex: 1, fontSize: 14, textDecoration: "line-through", color: t.textMute }}>{todo.name}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Input fixed */}
    <div style={{
      position: "absolute",
      bottom: 90, left: 16, right: 16,
      background: t.surface,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 14,
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "0 12px 32px -10px rgba(0,0,0,0.5)",
    }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: t.primarySoft, color: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconPlus size={14} stroke={2.5} />
      </div>
      <div style={{ flex: 1, fontSize: 14, color: t.textMute }}>Dodaj zadanie do listy "Dom"…</div>
      <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, padding: "2px 6px", background: t.bg, borderRadius: 4, border: `1px solid ${t.border}` }}>↵</div>
    </div>

    <BottomNav t={t} active="todo" />
  </div>
);

// === CALENDAR =============================================================

const CalendarMobile = ({ t }) => {
  const days = [];
  for (let d = 1; d <= 30; d++) days.push(d);
  const eventsBy = {
    3: ["#7FA882"],
    7: ["#D9532A", "#6E8DB5"],
    11: ["#D4A574"],
    15: ["#D9532A"],
    22: ["#7FA882", "#D9532A", "#D4A574"],
    25: ["#6E8DB5"],
    28: ["#A07B4F"],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
      <MobileHeader t={t} kicker="Kalendarz" title="Listopad 2026" right={
        <div style={{ display: "flex", gap: 6 }}>
          <HeaderIcon t={t}><IconSearch size={14} /></HeaderIcon>
          <HeaderIcon t={t}><IconPlus size={16} /></HeaderIcon>
        </div>
      } />

      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
        {/* Month grid */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: 14,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {WEEK_DAYS.map((d, i) => (
                <div key={i} style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, textAlign: "center", padding: "4px 0", letterSpacing: "0.04em" }}>{d}</div>
              ))}
              {Array.from({ length: 5 }).map((_, i) => <div key={`b${i}`} />)}
              {days.map(d => {
                const ev = eventsBy[d];
                const isToday = d === 22;
                const isSelected = d === 25;
                return (
                  <div key={d} style={{
                    aspectRatio: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    padding: 4,
                    borderRadius: 8,
                    background: isSelected ? t.primarySoft : "transparent",
                    border: isSelected ? `1px solid ${t.primary}80` : "1px solid transparent",
                  }}>
                    <div style={{
                      width: 22, height: 22,
                      borderRadius: 99,
                      background: isToday ? t.primary : "transparent",
                      color: isToday ? t.bg : t.text,
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 500,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{d}</div>
                    {ev && (
                      <div style={{ display: "flex", gap: 2 }}>
                        {ev.slice(0, 3).map((c, i) => (
                          <div key={i} style={{ width: 4, height: 4, borderRadius: 99, background: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>piątek</div>
              <div style={{ fontFamily: t.fontSerif, fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>25 listopada</div>
            </div>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute }}>1 / 1</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { time: "08:30", title: "Joga w studio", cat: "Zdrowie", color: t.income, dur: "1h" },
              { time: "11:00", title: "Spotkanie zespołu — sprint review", cat: "Praca", color: t.info, dur: "45 min" },
              { time: "14:00", title: "Obiad z mamą", cat: "Rodzina", color: t.primary, dur: "1h 30m" },
              { time: "19:00", title: "Spotkanie modlitewne", cat: "Wspólnota", color: "#A07B4F", dur: "1h" },
            ].map((ev, i) => (
              <div key={i} style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderLeft: `3px solid ${ev.color}`,
                borderRadius: t.radius,
                cursor: "pointer",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}>
                <div style={{ minWidth: 48 }}>
                  <div style={{ fontFamily: t.fontMono, fontSize: 13, fontWeight: 600, color: t.text }}>{ev.time}</div>
                  <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, marginTop: 2 }}>{ev.dur}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.title}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "2px 8px", background: `${ev.color}1A`, color: ev.color, borderRadius: 99, fontSize: 10, fontFamily: t.fontMono, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
                    {ev.cat}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav t={t} active="calendar" />
    </div>
  );
};

// === PRAYER ===============================================================

const PrayerMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Modlitwa" title="Cisza wieczorna" right={
      <HeaderIcon t={t}><IconBell size={14} /></HeaderIcon>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Verse of the day card */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{
          background: `linear-gradient(135deg, ${t.surface} 0%, ${t.bg2} 100%)`,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusLg,
          padding: "24px 22px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* deco mark */}
          <div style={{
            position: "absolute",
            top: 14, right: 14,
            color: t.primary,
            opacity: 0.5,
          }}>
            <IconPrayer size={22} />
          </div>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
            Werset dnia · 25.11
          </div>
          <p style={{
            fontFamily: t.fontSerif,
            fontSize: 22,
            lineHeight: 1.35,
            fontStyle: "italic",
            margin: 0,
            color: t.text,
            letterSpacing: "-0.005em",
          }}>
            "Bądź cicho przed Panem i czekaj cierpliwie na Niego."
          </p>
          <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textSub, marginTop: 12, letterSpacing: "0.04em" }}>
            — Psalm 37,7
          </div>
        </div>
      </div>

      {/* Streak + stats */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <StatTile t={t} value="34" label="dni z rzędu" Icon={IconFlame} color={t.primary} />
          <StatTile t={t} value="142" label="modlitw" Icon={IconHeart} color={t.expense} />
          <StatTile t={t} value="8" label="intencji" Icon={IconStar} color={t.warn} />
        </div>
      </div>

      {/* Intentions */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <FieldLabel t={t}>Intencje · aktywne</FieldLabel>
          <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute }}>3 / 8</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { title: "Zdrowie taty", days: 12, badge: "♥", color: t.expense },
            { title: "Mądrość w decyzjach zawodowych", days: 5, badge: "✦", color: t.warn },
            { title: "Pokój w rodzinie", days: 28, badge: "○", color: t.income },
          ].map((it, i) => (
            <div key={i} style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radius,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 12,
                background: `${it.color}1A`,
                border: `1px solid ${it.color}40`,
                color: it.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: t.fontSerif,
                fontSize: 20,
              }}>
                {it.badge}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</div>
                <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, marginTop: 2, letterSpacing: "0.04em" }}>
                  ↳ {it.days} dni · ostatnio dziś
                </div>
              </div>
              <IconChevronRight size={14} style={{ color: t.textMute }} />
            </div>
          ))}
        </div>
      </div>

      {/* Today reflection */}
      <div style={{ padding: "20px 20px 0" }}>
        <FieldLabel t={t}>Refleksja dnia</FieldLabel>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <IconClock size={12} style={{ color: t.textMute }} />
            <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.06em" }}>21:14 · 5 min</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: t.textSub, margin: 0, fontStyle: "italic" }}>
            "Dziś trudno mi było wyciszyć myśli. Wracałam do rozmowy z M. – modlę się o łagodność serca."
          </p>
        </div>

        <button style={{
          width: "100%",
          marginTop: 10,
          padding: "12px",
          borderRadius: t.radius,
          background: "transparent",
          color: t.textSub,
          border: `1px dashed ${t.border}`,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconPlus size={12} />Dodaj wpis
        </button>
      </div>
    </div>

    <BottomNav t={t} active="prayer" />
  </div>
);

const StatTile = ({ t, value, label, Icon, color }) => (
  <div style={{
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    padding: 14,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  }}>
    <div style={{ color }}>
      <Icon size={16} />
    </div>
    <div style={{ fontFamily: t.fontSerif, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
    <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
  </div>
);

// === SETTINGS DRAWER ======================================================

const SettingsDrawerMobile = ({ t }) => (
  <div style={{ position: "relative", height: "100%", background: t.bg, overflow: "hidden" }}>
    {/* Dimmed budget under it */}
    <div style={{ filter: "blur(2px)", opacity: 0.3 }}>
      <TransactionsMobile t={t} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />

    <div style={{
      position: "absolute",
      top: 0, right: 0, bottom: 0,
      width: "85%",
      background: t.bg2,
      borderLeft: `1px solid ${t.border}`,
      padding: "0",
      color: t.text,
      fontFamily: t.fontSans,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
    }}>
      {/* Drawer header — profile */}
      <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: 99,
              background: t.primary,
              color: t.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: t.fontSerif,
              fontSize: 20,
              fontWeight: 400,
            }}>L</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Laura Nowak</div>
              <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.04em" }}>laura@mail.com</div>
            </div>
          </div>
          <HeaderIcon t={t}><IconClose size={14} /></HeaderIcon>
        </div>
      </div>

      {/* Modules grid */}
      <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Moduły</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "Budżet", Ico: IconBudget, active: true },
            { label: "Nawyki", Ico: IconHabits },
            { label: "Nastrój", Ico: IconMood },
            { label: "To-do", Ico: IconTodo },
            { label: "Kalend.", Ico: IconCalendar },
            { label: "Modlit.", Ico: IconPrayer },
          ].map((m, i) => (
            <div key={i} style={{
              padding: "14px 8px",
              background: m.active ? t.primarySoft : t.surface,
              border: `1px solid ${m.active ? t.primary : t.border}`,
              borderRadius: t.radius,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              color: m.active ? t.primary : t.textSub,
              cursor: "pointer",
            }}>
              <m.Ico size={20} />
              <span style={{ fontSize: 11, fontWeight: m.active ? 600 : 500 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings of current module */}
      <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Budżet · ustawienia</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { Ico: IconBank, label: "Konta", val: "4 aktywne" },
            { Ico: IconShopping, label: "Kategorie", val: "12" },
            { Ico: IconTransfer, label: "Płatności regularne", val: "8" },
            { Ico: IconSavings, label: "Cele oszczędnościowe", val: "3" },
            { Ico: IconBell, label: "Przypomnienia", val: null },
            { Ico: IconHeart, label: "Dziesięcina", val: "10%" },
          ].map((it, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 4px",
              color: t.textSub,
              cursor: "pointer",
            }}>
              <it.Ico size={16} style={{ color: t.textMute }} />
              <span style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
              {it.val && <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.04em" }}>{it.val}</span>}
              <IconChevronRight size={14} style={{ color: t.textMute }} />
            </div>
          ))}
        </div>
      </div>

      {/* General */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Aplikacja</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { Ico: IconEye, label: "Wygląd", val: "Ciemny" },
            { Ico: IconLock, label: "Prywatność i PIN", val: null },
            { Ico: IconSparkle, label: "Eksport danych", val: null },
          ].map((it, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 4px",
              color: t.textSub,
              cursor: "pointer",
            }}>
              <it.Ico size={16} style={{ color: t.textMute }} />
              <span style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
              {it.val && <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.04em" }}>{it.val}</span>}
              <IconChevronRight size={14} style={{ color: t.textMute }} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: "20px", borderTop: `1px solid ${t.border}`, textAlign: "center" }}>
        <button style={{
          padding: "8px 20px",
          background: "transparent",
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusSm,
          color: t.textMute,
          fontSize: 12,
          cursor: "pointer",
          width: "100%",
        }}>Wyloguj</button>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.1em", marginTop: 12, opacity: 0.6 }}>v 1.0.0 · made with care</div>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  HabitsWeekMobile, HabitsTodayMobile,
  MoodPickerMobile, MoodCalendarMobile,
  TodoMobile, CalendarMobile, PrayerMobile,
  SettingsDrawerMobile,
  StatTile, MoodMark,
});
