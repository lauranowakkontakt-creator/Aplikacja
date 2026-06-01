// Budget module screens — Transactions, Add transaction, Accounts, Charts
// All take `t` (token object) — call from inside <TokenScope variant=...>

// === Shared data ===========================================================

const SAMPLE_TRANSACTIONS = [
  { id: 1, cat: "food", catLabel: "Jedzenie", desc: "Lidl",          amount: -132.40, date: "wt, 25 lis", Icon: IconFood,    color: "#D9532A" },
  { id: 2, cat: "fuel", catLabel: "Paliwo",   desc: "Orlen",         amount: -240.00, date: "wt, 25 lis", Icon: IconFuel,    color: "#E0B570" },
  { id: 3, cat: "inc",  catLabel: "Wypłata",  desc: "ACME sp. z o.o", amount: 7800.00,  date: "pn, 24 lis", Icon: IconWork,   color: "#7FA882", income: true },
  { id: 4, cat: "coffee", catLabel: "Kawa",    desc: "Costa",         amount: -19.50,  date: "pn, 24 lis", Icon: IconCoffee, color: "#A07B4F" },
  { id: 5, cat: "transport", catLabel: "Komunikacja", desc: "Bilet miesięczny", amount: -160.00, date: "nd, 23 lis", Icon: IconTransport, color: "#6E8DB5" },
  { id: 6, cat: "entertainment", catLabel: "Kino", desc: "Helios",    amount: -68.00,  date: "sb, 22 lis", Icon: IconEntertainment, color: "#C97A55" },
  { id: 7, cat: "shopping", catLabel: "Zakupy",    desc: "Zalando",   amount: -349.00, date: "pt, 21 lis", Icon: IconShopping, color: "#D9532A" },
];

const SAMPLE_ACCOUNTS = [
  { name: "ING konto bieżące",  type: "Bank · PLN",      balance: 4280.16, Icon: IconBank,    accent: "#7FA882" },
  { name: "Gotówka",            type: "Portfel",         balance: 380.00,  Icon: IconCash,    accent: "#D4A574" },
  { name: "Karta Revolut",      type: "Karta · multi",   balance: 1240.55, Icon: IconCard,    accent: "#6E8DB5" },
  { name: "Konto oszczędnościowe", type: "Oszczędności", balance: 12500.00, Icon: IconSavings, accent: "#D9532A" },
];

// === Mobile: Transactions list (HOME of Budget) ============================

const TransactionsMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Budżet" title="Listopad 2026" right={
      <div style={{ display: "flex", gap: 8 }}>
        <HeaderIcon t={t}><IconSearch size={16} /></HeaderIcon>
        <HeaderIcon t={t}><IconMore size={16} /></HeaderIcon>
      </div>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Month switcher */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={iconBtn(t)}><IconChevronLeft size={16} /></button>
        <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          1 — 30 listopada
        </div>
        <button style={iconBtn(t)}><IconChevronRight size={16} /></button>
      </div>

      {/* Balance card */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusLg,
          padding: "20px 22px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
            saldo miesiąca
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: t.fontSerif, fontSize: 44, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", color: t.income, whiteSpace: "nowrap" }}>
              +6 691
            </span>
            <span style={{ fontFamily: t.fontSerif, fontSize: 22, fontWeight: 500, color: t.income, opacity: 0.7 }}>,10 zł</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
            <Stat t={t} label="Przychody" value="+ 7 800,00" tone="income" />
            <div style={{ width: 1, background: t.border }} />
            <Stat t={t} label="Wydatki" value="− 1 108,90" tone="expense" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "20px 20px 0" }}>
        <SegTabs t={t} active="trans" items={[
          { id: "trans", label: "Transakcje" },
          { id: "konta", label: "Konta" },
          { id: "wyk",   label: "Wykresy" },
          { id: "reg",   label: "Regularne" },
        ]} />
      </div>

      {/* List */}
      <div style={{ padding: "20px 20px 0" }}>
        <DateGroup t={t} date="Wtorek · 25 LIS" sum="−372,40">
          <TxRow t={t} tx={SAMPLE_TRANSACTIONS[0]} />
          <TxRow t={t} tx={SAMPLE_TRANSACTIONS[1]} />
        </DateGroup>
        <DateGroup t={t} date="Poniedziałek · 24 LIS" sum="+7 780,50">
          <TxRow t={t} tx={SAMPLE_TRANSACTIONS[2]} />
          <TxRow t={t} tx={SAMPLE_TRANSACTIONS[3]} />
        </DateGroup>
        <DateGroup t={t} date="Niedziela · 23 LIS" sum="−160,00">
          <TxRow t={t} tx={SAMPLE_TRANSACTIONS[4]} />
        </DateGroup>
      </div>
    </div>

    {/* FAB */}
    <button style={{
      position: "absolute",
      right: 20, bottom: 100,
      width: 56, height: 56,
      borderRadius: 18,
      background: t.primary,
      color: t.bg,
      border: "none",
      boxShadow: `0 12px 30px -10px ${t.primary}80`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    }}>
      <IconPlus size={22} stroke={2.5} />
    </button>

    <BottomNav t={t} active="budget" />
  </div>
);

// === Desktop: Transactions + sidebar ======================================

const TransactionsDesktop = ({ t }) => (
  <DesktopShell t={t} active="budget" title="Budżet">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100%" }}>
      {/* Main column */}
      <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Sub-tabs row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: `1px solid ${t.border}`,
        }}>
          <SegTabs t={t} active="trans" items={[
            { id: "trans", label: "Transakcje" },
            { id: "konta", label: "Konta" },
            { id: "wyk",   label: "Wykresy" },
            { id: "reg",   label: "Regularne" },
            { id: "zak",   label: "Zakupy" },
          ]} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={iconBtn(t)}><IconChevronLeft size={14} /></button>
            <span style={{ fontFamily: t.fontMono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textSub }}>Listopad 2026</span>
            <button style={iconBtn(t)}><IconChevronRight size={14} /></button>
            <button style={{
              padding: "8px 12px",
              borderRadius: t.radiusSm,
              border: "none",
              background: t.primary,
              color: t.bg,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: t.fontSans,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              marginLeft: 6,
            }}>
              <IconPlus size={14} stroke={2.5} />Dodaj
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 32, overflow: "auto", flex: 1 }}>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            <BigStat t={t} kicker="Saldo miesiąca" value="+ 6 691,10 zł" tone="income" big />
            <BigStat t={t} kicker="Przychody"     value="+ 7 800,00 zł" tone="income" />
            <BigStat t={t} kicker="Wydatki"       value="− 1 108,90 zł" tone="expense" />
            <BigStat t={t} kicker="Średnio dziennie" value="44,36 zł" />
          </div>

          {/* Transactions table */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 140px 140px 100px",
              gap: 16,
              padding: "10px 20px",
              borderBottom: `1px solid ${t.border}`,
              fontFamily: t.fontMono,
              fontSize: 10,
              color: t.textMute,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              <div style={{ width: 26 }} />
              <div>Kategoria · opis</div>
              <div>Konto</div>
              <div>Data</div>
              <div style={{ textAlign: "right" }}>Kwota</div>
            </div>
            {SAMPLE_TRANSACTIONS.map(tx => <DesktopTxRow key={tx.id} t={t} tx={tx} />)}
          </div>
        </div>
      </div>

      {/* Right rail: monthly summary */}
      <aside style={{
        borderLeft: `1px solid ${t.border}`,
        background: t.bg2,
        padding: 24,
        overflow: "auto",
      }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Top kategorie · listopad</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {[
            { Icon: IconFood, label: "Jedzenie", amount: 432.4, pct: 39 },
            { Icon: IconFuel, label: "Paliwo", amount: 240, pct: 22 },
            { Icon: IconTransport, label: "Komunikacja", amount: 160, pct: 14 },
            { Icon: IconCoffee, label: "Kawa", amount: 117.5, pct: 11 },
            { Icon: IconEntertainment, label: "Kino", amount: 68, pct: 6 },
          ].map((c, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <c.Icon size={14} style={{ color: t.textSub }} />
                  {c.label}
                </span>
                <span style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textSub }}>{c.amount.toFixed(2)} zł</span>
              </div>
              <div style={{ height: 3, background: t.surface, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", background: t.primary, opacity: 0.6 + (c.pct/100)*0.4 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Cele oszczędnościowe</div>
        <GoalCard t={t} name="Wakacje 2027" current={3200} target={6000} accent={t.primary} />
        <GoalCard t={t} name="Poduszka 3m" current={9800} target={15000} accent={t.income} />

      </aside>
    </div>
  </DesktopShell>
);

// === Add transaction modal (mobile) ========================================

const AddTransactionMobile = ({ t }) => (
  <div style={{ position: "relative", height: "100%", overflow: "hidden", background: t.bg }}>
    {/* Dimmed background (transactions list) */}
    <div style={{ filter: "blur(2px)", opacity: 0.35 }}>
      <TransactionsMobile t={t} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />

    {/* Sheet */}
    <div style={{
      position: "absolute",
      left: 0, right: 0, bottom: 0,
      background: t.surface,
      borderTop: `1px solid ${t.border}`,
      borderRadius: `${t.radiusLg} ${t.radiusLg} 0 0`,
      padding: "12px 20px 22px",
      maxHeight: "78%",
    }}>
      {/* Grip */}
      <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 12px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>Nowa transakcja</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2 }}>Dodaj wpis</div>
        </div>
        <HeaderIcon t={t}><IconClose size={16} /></HeaderIcon>
      </div>

      {/* Type toggle */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: 4,
        marginBottom: 18,
      }}>
        <div style={{
          padding: "10px",
          textAlign: "center",
          background: t.expense,
          color: t.bg,
          borderRadius: t.radiusSm,
          fontSize: 13,
          fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconArrowDown size={14} stroke={2.5} />Wydatek
        </div>
        <div style={{
          padding: "10px",
          textAlign: "center",
          color: t.textMute,
          fontSize: 13,
          fontWeight: 500,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconArrowUp size={14} />Przychód
        </div>
      </div>

      {/* Big amount */}
      <div style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: "18px 16px",
        textAlign: "center",
        marginBottom: 14,
      }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Kwota</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: t.fontSerif, fontSize: 40, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", color: t.text }}>132</span>
          <span style={{ fontFamily: t.fontSerif, fontSize: 24, fontWeight: 500, color: t.textSub }}>,40</span>
          <span style={{ fontFamily: t.fontMono, fontSize: 13, color: t.textMute, marginLeft: 6 }}>zł</span>
        </div>
      </div>

      {/* Category grid */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel t={t}>Kategoria</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {[
            [IconFood, "Jedzenie", true],
            [IconTransport, "Trans."],
            [IconShopping, "Zakupy"],
            [IconHome, "Dom"],
            [IconCoffee, "Kawa"],
            [IconHealth, "Zdrowie"],
            [IconFuel, "Paliwo"],
            [IconEntertainment, "Rozrywka"],
            [IconBills, "Rach."],
            [IconMore, "więcej"],
          ].map(([Ico, lbl, active], i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 44, height: 44,
                borderRadius: 14,
                border: `1px solid ${active ? t.primary : t.border}`,
                background: active ? t.primarySoft : t.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: active ? t.primary : t.textSub,
              }}>
                <Ico size={18} />
              </div>
              <span style={{ fontSize: 9, color: active ? t.text : t.textMute, fontWeight: active ? 600 : 400 }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Account + desc combined */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <FieldBlock t={t} label="Konto" value="ING bieżące" icon={IconBank} />
        <FieldBlock t={t} label="Data" value="Dziś · 25 lis" icon={IconCalendar} />
      </div>

      <FieldBlock t={t} label="Opis" value="Lidl" icon={null} placeholder />

      <button style={{
        width: "100%",
        marginTop: 16,
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
        Zapisz transakcję
      </button>
    </div>
  </div>
);

// === Accounts (mobile) =====================================================

const AccountsMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Budżet · Konta" title="Mój majątek" right={
      <HeaderIcon t={t}><IconEye size={16} /></HeaderIcon>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Total */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusLg,
          padding: "22px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>Łącznie</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: t.fontSerif, fontSize: 46, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>18 400</span>
            <span style={{ fontFamily: t.fontSerif, fontSize: 26, fontWeight: 500, color: t.textSub }}>,71 zł</span>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden" }}>
            {SAMPLE_ACCOUNTS.map((a, i) => (
              <div key={i} style={{
                flex: a.balance,
                background: a.accent,
                opacity: 0.85,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 6, gap: 4, flexWrap: "wrap" }}>
            {SAMPLE_ACCOUNTS.map((a, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: t.fontMono, color: t.textMute, letterSpacing: "0.04em" }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: a.accent }} /> {a.name.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts list */}
      <div style={{ padding: "20px 20px 0" }}>
        <FieldLabel t={t}>Konta</FieldLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SAMPLE_ACCOUNTS.map((a, i) => (
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
                width: 44, height: 44,
                borderRadius: 13,
                background: `${a.accent}1A`,
                border: `1px solid ${a.accent}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: a.accent,
              }}>
                <a.Icon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{a.type}</div>
              </div>
              <div style={{ fontFamily: t.fontSerif, fontSize: 18, color: t.text }}>{PLN(a.balance).replace(" zł", "")}<span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, marginLeft: 4 }}>zł</span></div>
            </div>
          ))}

          <button style={{
            background: "transparent",
            border: `1px dashed ${t.border}`,
            borderRadius: t.radius,
            padding: 14,
            color: t.textMute,
            fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: "pointer",
          }}>
            <IconPlus size={14} />Dodaj konto
          </button>
        </div>
      </div>

      {/* Transfer shortcut */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: t.bg2,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: 12,
            background: t.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.primary,
          }}>
            <IconTransfer size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Przelew między kontami</div>
            <div style={{ fontSize: 11, color: t.textMute }}>Nie wpływa na saldo miesiąca</div>
          </div>
          <IconChevronRight size={16} style={{ color: t.textMute }} />
        </div>
      </div>
    </div>

    <BottomNav t={t} active="budget" />
  </div>
);

// === Charts (mobile) =======================================================

const ChartsMobile = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, color: t.text, fontFamily: t.fontSans, position: "relative" }}>
    <MobileHeader t={t} kicker="Budżet · Wykresy" title="Listopad" right={
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button style={iconBtn(t)}><IconChevronLeft size={14} /></button>
        <button style={iconBtn(t)}><IconChevronRight size={14} /></button>
      </div>
    } />

    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 90 }}>
      {/* Donut chart fake */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusLg,
          padding: "22px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}>
          <Donut t={t} size={120} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>razem wydane</div>
            <div style={{ fontFamily: t.fontSerif, fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 2, color: t.expense, whiteSpace: "nowrap" }}>1&nbsp;108,90<span style={{ fontSize: 14, color: t.textMute, fontFamily: t.fontMono, marginLeft: 4 }}>zł</span></div>
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>14% mniej niż w październiku</div>
          </div>
        </div>
      </div>

      {/* Bars by week */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: 18,
        }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Tygodnie</div>
          <Bars t={t} />
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ padding: "16px 20px 0" }}>
        <FieldLabel t={t}>Kategorie</FieldLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { Icon: IconFood, label: "Jedzenie", amount: 432.4, pct: 39, color: t.primary },
            { Icon: IconFuel, label: "Paliwo", amount: 240, pct: 22, color: t.warn },
            { Icon: IconTransport, label: "Komunikacja", amount: 160, pct: 14, color: t.info },
            { Icon: IconCoffee, label: "Kawa", amount: 117.5, pct: 11, color: "#A07B4F" },
            { Icon: IconEntertainment, label: "Kino", amount: 68, pct: 6, color: t.income },
            { Icon: IconShopping, label: "Zakupy", amount: 91, pct: 8, color: "#C97A55" },
          ].map((c, i) => (
            <div key={i} style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radiusSm,
              padding: "10px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.color}1A`, border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color }}>
                  <c.Icon size={14} />
                </div>
                <span style={{ fontSize: 13, flex: 1 }}>{c.label}</span>
                <span style={{ fontFamily: t.fontMono, fontSize: 12, color: t.textSub }}>{c.amount.toFixed(2)}</span>
              </div>
              <div style={{ height: 4, background: t.bg, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <BottomNav t={t} active="budget" />
  </div>
);

// === Atoms used by these screens ===========================================

const iconBtn = (t) => ({
  width: 30, height: 30,
  borderRadius: 9,
  background: t.surface,
  border: `1px solid ${t.border}`,
  color: t.text,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
});

const Stat = ({ t, label, value, tone }) => {
  const color = tone === "income" ? t.income : tone === "expense" ? t.expense : t.text;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: t.fontMono, fontSize: 14, color, marginTop: 4, fontWeight: 500, letterSpacing: "0.01em" }}>{value}</div>
    </div>
  );
};

const BigStat = ({ t, kicker, value, tone, big }) => {
  const color = tone === "income" ? t.income : tone === "expense" ? t.expense : t.text;
  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      padding: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em", textTransform: "uppercase" }}>{kicker}</div>
      <div style={{
        fontFamily: t.fontSerif,
        fontSize: big ? 30 : 22,
        letterSpacing: "-0.02em",
        marginTop: 6,
        color,
      }}>{value}</div>
    </div>
  );
};

const SegTabs = ({ t, items, active }) => {
  const [cur, setCur] = React.useState(active);
  return (
  <div style={{ display: "flex", gap: 4, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4 }}>
    {items.map(it => (
      <div key={it.id} onClick={() => setCur(it.id)} style={{
        padding: "7px 12px",
        borderRadius: 9,
        background: cur === it.id ? t.bg : "transparent",
        color: cur === it.id ? t.text : t.textMute,
        fontSize: 12,
        fontWeight: cur === it.id ? 600 : 500,
        cursor: "pointer",
        transition: "background 0.25s ease, color 0.25s ease",
        border: cur === it.id ? `1px solid ${t.border}` : "1px solid transparent",
      }}>{it.label}</div>
    ))}
  </div>
  );
};

const DateGroup = ({ t, date, sum, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.14em" }}>{date}</span>
      <span style={{ fontFamily: t.fontMono, fontSize: 10, color: sum.startsWith("+") ? t.income : t.textSub, letterSpacing: "0.04em" }}>{sum}</span>
    </div>
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: "hidden" }}>
      {children}
    </div>
  </div>
);

const TxRow = ({ t, tx }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderBottom: `1px solid ${t.border}`,
    cursor: "pointer",
  }}>
    <div style={{
      width: 36, height: 36,
      borderRadius: 11,
      background: `${tx.color}1A`,
      border: `1px solid ${tx.color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: tx.color,
      flexShrink: 0,
    }}>
      <tx.Icon size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{tx.catLabel}</div>
      <div style={{ fontSize: 11, color: t.textMute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.desc}</div>
    </div>
    <div style={{
      fontFamily: t.fontMono,
      fontSize: 13,
      fontWeight: 600,
      color: tx.income ? t.income : t.text,
      letterSpacing: "0.01em",
    }}>
      {tx.income ? "+ " : "− "}{Math.abs(tx.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2 })}
    </div>
  </div>
);

const DesktopTxRow = ({ t, tx }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: "auto 1fr 140px 140px 100px",
    gap: 16,
    padding: "14px 20px",
    borderBottom: `1px solid ${t.border}`,
    alignItems: "center",
    transition: "background 0.12s",
    cursor: "pointer",
  }}>
    <div style={{
      width: 32, height: 32,
      borderRadius: 9,
      background: `${tx.color}1A`,
      border: `1px solid ${tx.color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: tx.color,
    }}>
      <tx.Icon size={14} />
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.catLabel}</div>
      <div style={{ fontSize: 11, color: t.textMute }}>{tx.desc}</div>
    </div>
    <div style={{ fontSize: 12, color: t.textSub }}>ING bieżące</div>
    <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMute, letterSpacing: "0.04em" }}>{tx.date}</div>
    <div style={{
      textAlign: "right",
      fontFamily: t.fontMono,
      fontSize: 13,
      fontWeight: 600,
      color: tx.income ? t.income : t.text,
    }}>
      {tx.income ? "+ " : "− "}{Math.abs(tx.amount).toFixed(2)}
    </div>
  </div>
);

const FieldLabel = ({ t, children }) => (
  <div style={{
    fontFamily: t.fontMono,
    fontSize: 9,
    color: t.textMute,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: 8,
  }}>
    {children}
  </div>
);

const FieldBlock = ({ t, label, value, icon: Ico, placeholder }) => (
  <div style={{
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusSm,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  }}>
    {Ico && <Ico size={16} style={{ color: t.textMute }} />}
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: t.fontMono, fontSize: 8, color: t.textMute, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, color: placeholder ? t.textMute : t.text, marginTop: 1, fontWeight: placeholder ? 400 : 500 }}>{value}</div>
    </div>
    <IconChevronRight size={14} style={{ color: t.textMute }} />
  </div>
);

const GoalCard = ({ t, name, current, target, accent }) => {
  const pct = Math.round((current / target) * 100);
  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusSm,
      padding: 12,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{name}</span>
        <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMute }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: t.bg, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: t.fontMono, fontSize: 10, color: t.textMute }}>
        <span>{current.toLocaleString("pl-PL")} zł</span>
        <span>z {target.toLocaleString("pl-PL")} zł</span>
      </div>
    </div>
  );
};

const Donut = ({ t, size = 120 }) => {
  // 5 segments fake
  const segments = [
    { val: 39, color: t.primary },
    { val: 22, color: t.warn },
    { val: 14, color: t.info },
    { val: 11, color: "#A07B4F" },
    { val: 14, color: t.income },
  ];
  const r = size / 2 - 10;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.bg2} strokeWidth={14} />
      {segments.map((s, i) => {
        const len = (s.val / 100) * C;
        const seg = (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={14}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        );
        offset += len;
        return seg;
      })}
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={t.text} fontFamily={t.fontMono} fontSize={11} letterSpacing="0.04em">100%</text>
    </svg>
  );
};

const Bars = ({ t }) => {
  const weeks = [
    { lbl: "1–7",   val: 280 },
    { lbl: "8–14",  val: 410 },
    { lbl: "15–21", val: 180 },
    { lbl: "22–28", val: 245 },
  ];
  const max = Math.max(...weeks.map(w => w.val));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 120 }}>
      {weeks.map((w, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute }}>{w.val}</div>
          <div style={{
            width: "100%",
            height: `${(w.val/max) * 96}px`,
            background: t.primary,
            opacity: 0.5 + (w.val/max) * 0.5,
            borderRadius: 4,
          }} />
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMute, letterSpacing: "0.04em" }}>{w.lbl}</div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, {
  TransactionsMobile, TransactionsDesktop, AddTransactionMobile, AccountsMobile, ChartsMobile,
  iconBtn, Stat, BigStat, SegTabs, DateGroup, TxRow, FieldLabel, FieldBlock, GoalCard, Donut, Bars,
});
