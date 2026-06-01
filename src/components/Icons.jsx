// Geometric SVG icon system — stroke-based, 24x24 viewBox

const Icon = ({ children, size = 20, stroke = 1.5, style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...rest}
  >
    {children}
  </svg>
)

export const IconBudget = (p) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconHabits = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M15 17l2 2 4-4" />
  </Icon>
)

export const IconMood = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <path d="M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" />
  </Icon>
)

export const IconTodo = (p) => (
  <Icon {...p}>
    <path d="M4 6.5l2 2 3-3.5" />
    <path d="M4 13l2 2 3-3.5" />
    <path d="M12 7h8" />
    <path d="M12 13.5h8" />
    <path d="M12 20h6" />
    <path d="M4 19.5l2 2 3-3.5" opacity="0.5" />
  </Icon>
)

export const IconCalendar = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconPrayer = (p) => (
  <Icon {...p}>
    <path d="M12 2v20" />
    <path d="M4 8h16" />
  </Icon>
)

export const IconSettings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
  </Icon>
)

export const IconMore = (p) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconPlus = (p) => (
  <Icon {...p} stroke={p.stroke || 2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconClose = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const IconCheck = (p) => (
  <Icon {...p} stroke={p.stroke || 2}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
)

export const IconChevronLeft = (p) => (
  <Icon {...p}>
    <path d="M14 6l-6 6 6 6" />
  </Icon>
)

export const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="M10 6l6 6-6 6" />
  </Icon>
)

export const IconChevronDown = (p) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

export const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Icon>
)

export const IconArrowUp = (p) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
)

export const IconArrowDown = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
)

export const IconTransfer = (p) => (
  <Icon {...p}>
    <path d="M4 8h13M14 5l3 3-3 3" />
    <path d="M20 16H7M10 13l-3 3 3 3" />
  </Icon>
)

export const IconEdit = (p) => (
  <Icon {...p}>
    <path d="M16 4l4 4-11 11H5v-4z" />
  </Icon>
)

export const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icon>
)

export const IconEye = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
)

export const IconEyeOff = (p) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.2 3.9" />
    <path d="M6.3 7.9A16 16 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.7" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
)

export const IconFood = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const IconTransport = (p) => (
  <Icon {...p}>
    <rect x="3" y="8" width="18" height="9" rx="2" />
    <circle cx="7.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
    <path d="M3 12h18" />
  </Icon>
)

export const IconShopping = (p) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 8V5a3 3 0 0 1 6 0v3" />
  </Icon>
)

export const IconHome = (p) => (
  <Icon {...p}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
  </Icon>
)

export const IconHealth = (p) => (
  <Icon {...p}>
    <path d="M12 6v12M6 12h12" strokeWidth={p.stroke || 2.5} />
  </Icon>
)

export const IconWork = (p) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </Icon>
)

export const IconBills = (p) => (
  <Icon {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </Icon>
)

export const IconGift = (p) => (
  <Icon {...p}>
    <rect x="3" y="9" width="18" height="12" rx="1" />
    <path d="M3 13h18M12 9v12" />
    <path d="M12 9c-2-3-5-3-5-1s2 2 5 1zM12 9c2-3 5-3 5-1s-2 2-5 1z" />
  </Icon>
)

export const IconFuel = (p) => (
  <Icon {...p}>
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M4 21h12" />
    <path d="M15 9l2-2v9a2 2 0 0 0 2 2" />
    <path d="M15 13h2" />
  </Icon>
)

export const IconCoffee = (p) => (
  <Icon {...p}>
    <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
    <path d="M17 11h2a2 2 0 0 1 0 4h-2" />
    <path d="M8 3v3M12 3v3" />
  </Icon>
)

export const IconBank = (p) => (
  <Icon {...p}>
    <path d="M2 9l10-5 10 5" />
    <path d="M4 9v10M20 9v10M9 9v10M15 9v10" />
    <path d="M2 21h20" />
  </Icon>
)

export const IconCash = (p) => (
  <Icon {...p}>
    <rect x="2" y="7" width="20" height="11" rx="1.5" />
    <circle cx="12" cy="12.5" r="2.5" />
    <path d="M5 10v5M19 10v5" opacity="0.5" />
  </Icon>
)

export const IconCard = (p) => (
  <Icon {...p}>
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </Icon>
)

export const IconSavings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7v10M9 10h4.5a1.5 1.5 0 0 1 0 3H9.5a1.5 1.5 0 0 0 0 3H14" />
  </Icon>
)

export const IconBell = (p) => (
  <Icon {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
)

export const IconFlame = (p) => (
  <Icon {...p}>
    <path d="M12 3s5 4 5 9a5 5 0 1 1-10 0c0-2 1-3.5 2-4 0 2 1 3 2 3 0-3 1-5 1-8z" />
  </Icon>
)

export const IconFlag = (p) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4l12 2-2 4 2 4-12-2" />
  </Icon>
)

export const IconStar = (p) => (
  <Icon {...p}>
    <path d="M12 3l2.6 5.6 6.2.7-4.6 4.2 1.3 6.1L12 16.7l-5.5 2.9 1.3-6.1L3.2 9.3l6.2-.7z" />
  </Icon>
)

export const IconHeart = (p) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3.5 0 6 3.5 4.5 7-2 4.5-9 9-9 9z" />
  </Icon>
)

export const IconLogo = (p) => (
  <Icon {...p}>
    <path d="M12 3l9 9-9 9-9-9z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const IconEducation = (p) => (
  <Icon {...p}>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c0 2 3 3 6 3s6-1 6-3v-5" />
  </Icon>
)

export const IconEntertainment = (p) => (
  <Icon {...p}>
    <path d="M5 5l14 7-14 7z" />
  </Icon>
)

export const IconTravel = (p) => (
  <Icon {...p}>
    <path d="M22 16.5H2" />
    <path d="M12 3C9 3 6 5.5 6 9l-4 7.5h20L18 9c0-3.5-3-6-6-6z" />
    <path d="M9 16.5v3M15 16.5v3" />
  </Icon>
)

export const IconRepeat = (p) => (
  <Icon {...p}>
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
)

export const IconClothing = (p) => (
  <Icon {...p}>
    <path d="M9 3H5L2 9l3 1V21h14V10l3-1-3-6h-4" />
    <path d="M9 3a3 3 0 0 0 6 0" />
  </Icon>
)

export const IconGoogle = (p) => (
  <Icon {...p} stroke={0}>
    <path fill="#4285F4" stroke="none" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
    <path fill="#34A853" stroke="none" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.5H2.3v2.8C4.1 20.6 7.8 23 12 23z" />
    <path fill="#FBBC05" stroke="none" d="M6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H2.3C1.5 8.8 1 10.3 1 12s.5 3.2 1.3 4.6L6 14.2z" />
    <path fill="#EA4335" stroke="none" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.5 2 15 1 12 1 7.8 1 4.1 3.4 2.3 7.4L6 10.2c.8-2.6 3.2-4.8 6-4.8z" />
  </Icon>
)

export const IconChart = (p) => (
  <Icon {...p}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </Icon>
)

export const IconUsers = (p) => (
  <Icon {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
)

export const IconBook = (p) => (
  <Icon {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Icon>
)

export const IconTag = (p) => (
  <Icon {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Icon>
)

// ── Extended icon set (110 icons) ──────────────────────────────────────────
export const IcWallet      = (p) => (<Icon {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4z"/><circle cx="16.5" cy="13" r="0.8" fill="currentColor" stroke="none"/></Icon>)
export const IcCoins       = (p) => (<Icon {...p}><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3"/><ellipse cx="15" cy="14" rx="6" ry="3"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3"/></Icon>)
export const IcChart       = (p) => (<Icon {...p}><path d="M4 4v16h16"/><path d="M8 14l3-4 3 2 4-6"/></Icon>)
export const IcPieChart    = (p) => (<Icon {...p}><path d="M12 3v9h9a9 9 0 1 0-9 9"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></Icon>)
export const IcReceipt     = (p) => (<Icon {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></Icon>)
export const IcTarget      = (p) => (<Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></Icon>)
export const IcScale       = (p) => (<Icon {...p}><path d="M12 4v16M6 8h12"/><path d="M6 8l-3 6h6zM18 8l-3 6h6z"/><path d="M9 20h6"/></Icon>)
export const IcPercent     = (p) => (<Icon {...p}><path d="M19 5L5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></Icon>)
export const IcVault       = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M16 12h-1M9 12H8"/></Icon>)
export const IcSofa        = (p) => (<Icon {...p}><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 2 2v3h16v-3a2 2 0 0 1 2-2"/><path d="M4 18v2M20 18v2"/></Icon>)
export const IcBed         = (p) => (<Icon {...p}><path d="M3 18V7M3 12h18v6M21 18v-4a2 2 0 0 0-2-2"/><path d="M3 12V9a2 2 0 0 1 2-2h5v5"/></Icon>)
export const IcLamp        = (p) => (<Icon {...p}><path d="M8 3h8l3 7H5z"/><path d="M12 10v8M9 21h6"/></Icon>)
export const IcKey         = (p) => (<Icon {...p}><circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16 16l2-2M19 19l2-2"/></Icon>)
export const IcDoor        = (p) => (<Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/></Icon>)
export const IcWashing     = (p) => (<Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/><circle cx="8" cy="6" r="0.8" fill="currentColor" stroke="none"/></Icon>)
export const IcPlant       = (p) => (<Icon {...p}><path d="M12 21v-7"/><path d="M12 14c-4 0-6-3-6-6 3 0 6 1 6 6zM12 12c0-4 2-7 6-7 0 4-2 7-6 7z"/></Icon>)
export const IcBroom       = (p) => (<Icon {...p}><path d="M15 4l-7 7M11 8l5 5"/><path d="M9 10l-5 5c-1 1-1 3 0 4s3 1 4 0l5-5z"/></Icon>)
export const IcTools       = (p) => (<Icon {...p}><path d="M14 7a3 3 0 0 0 4 4l3 3-3 3-3-3a3 3 0 0 1-4-4z"/><path d="M10 14l-6 6M5 5l4 4-1 1-4-4z"/></Icon>)
export const IcThermo      = (p) => (<Icon {...p}><path d="M10 13V5a2 2 0 0 1 4 0v8a4 4 0 1 1-4 0z"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/></Icon>)
export const IcPizza       = (p) => (<Icon {...p}><path d="M12 3L3 19c4 2 14 2 18 0z"/><circle cx="10" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1" fill="currentColor" stroke="none"/></Icon>)
export const IcBurger      = (p) => (<Icon {...p}><path d="M4 8a8 8 0 0 1 16 0z"/><path d="M3 12h18M5 15h14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/></Icon>)
export const IcApple       = (p) => (<Icon {...p}><path d="M12 7c-2-3-7-2-7 3 0 4 3 11 7 11s7-7 7-11c0-5-5-6-7-3z"/><path d="M12 7V4M12 4c0-1 1-2 2-2"/></Icon>)
export const IcWine        = (p) => (<Icon {...p}><path d="M7 3h10l-1 6a4 4 0 0 1-8 0z"/><path d="M12 13v6M8 21h8"/></Icon>)
export const IcCup         = (p) => (<Icon {...p}><path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></Icon>)
export const IcIceCream    = (p) => (<Icon {...p}><path d="M8 9a4 4 0 0 1 8 0z"/><path d="M8 9l4 12 4-12"/></Icon>)
export const IcCake        = (p) => (<Icon {...p}><path d="M4 21v-7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7z"/><path d="M4 16h16M12 8V5M12 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></Icon>)
export const IcFish        = (p) => (<Icon {...p}><path d="M3 12c4-5 11-5 15 0-4 5-11 5-15 0z"/><path d="M18 12l3-3v6zM8 12h.01"/></Icon>)
export const IcEgg         = (p) => (<Icon {...p}><path d="M12 3c-3 0-6 5-6 10a6 6 0 0 0 12 0c0-5-3-10-6-10z"/></Icon>)
export const IcBread       = (p) => (<Icon {...p}><path d="M5 11a4 4 0 0 1 0-8h14a4 4 0 0 1 0 8v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/></Icon>)
export const IcCar         = (p) => (<Icon {...p}><path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5"/><path d="M3 13h18v4H3z"/><circle cx="7" cy="17" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="17" r="1.5" fill="currentColor" stroke="none"/></Icon>)
export const IcBus         = (p) => (<Icon {...p}><rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16"/><circle cx="8" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="20" r="1.4" fill="currentColor" stroke="none"/></Icon>)
export const IcTrain       = (p) => (<Icon {...p}><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M8 20l-2 2M16 20l2 2"/><circle cx="9" cy="14" r="0.8" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="0.8" fill="currentColor" stroke="none"/></Icon>)
export const IcPlane       = (p) => (<Icon {...p}><path d="M21 15l-8-3V5a1.5 1.5 0 0 0-3 0v7l-8 3v2l8-2v3l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-3l8 2z"/></Icon>)
export const IcBike        = (p) => (<Icon {...p}><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h5l-3 7M10 10l2-3h3"/></Icon>)
export const IcScooter     = (p) => (<Icon {...p}><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 18h7l3-9h2M15 9l-1 9"/></Icon>)
export const IcShip        = (p) => (<Icon {...p}><path d="M3 16l2-5h14l2 5"/><path d="M3 16c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/><path d="M12 11V4M8 7h8"/></Icon>)
export const IcRocket      = (p) => (<Icon {...p}><path d="M12 3c3 2 5 6 5 10l-3 3h-4l-3-3c0-4 2-8 5-10z"/><circle cx="12" cy="10" r="1.6"/><path d="M9 18l-2 3M15 18l2 3"/></Icon>)
export const IcTaxi        = (p) => (<Icon {...p}><rect x="3" y="10" width="18" height="7" rx="1.5"/><path d="M6 10l1.5-4h9L18 10"/><path d="M9 4h6"/><circle cx="7" cy="20" r="1.2" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none"/></Icon>)
export const IcParking     = (p) => (<Icon {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 17V8h3.5a2.5 2.5 0 0 1 0 5H9"/></Icon>)
export const IcPill        = (p) => (<Icon {...p}><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/></Icon>)
export const IcHeartbeat   = (p) => (<Icon {...p}><path d="M3 12h4l2-5 3 10 2-5h7"/></Icon>)
export const IcStethoscope = (p) => (<Icon {...p}><path d="M5 3v5a4 4 0 0 0 8 0V3"/><path d="M9 16a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="11" r="2"/></Icon>)
export const IcTooth       = (p) => (<Icon {...p}><path d="M6 3c2 0 3 1 6 1s4-1 6-1c2 2 1 6 0 11-1 4-2 6-3 6s-1-4-3-4-2 4-3 4-2-2-3-6C5 9 4 5 6 3z"/></Icon>)
export const IcDumbbell    = (p) => (<Icon {...p}><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/></Icon>)
export const IcYoga        = (p) => (<Icon {...p}><circle cx="12" cy="5" r="2"/><path d="M12 7v6M5 20l7-4 7 4M7 12h10"/></Icon>)
export const IcBrain       = (p) => (<Icon {...p}><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4a2 2 0 0 0-3 0z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1"/></Icon>)
export const IcLeaf        = (p) => (<Icon {...p}><path d="M5 19c0-9 6-14 14-14 0 9-5 14-14 14z"/><path d="M5 19c3-4 7-7 11-9"/></Icon>)
export const IcDrop        = (p) => (<Icon {...p}><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></Icon>)
export const IcMoon        = (p) => (<Icon {...p}><path d="M20 13a8 8 0 1 1-9-9 6 6 0 0 0 9 9z"/></Icon>)
export const IcBriefcase   = (p) => (<Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></Icon>)
export const IcLaptop      = (p) => (<Icon {...p}><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20l-2-3H4z"/></Icon>)
export const IcPhoneDev    = (p) => (<Icon {...p}><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></Icon>)
export const IcMonitor     = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/></Icon>)
export const IcCode        = (p) => (<Icon {...p}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13 5l-2 14"/></Icon>)
export const IcKeyboard    = (p) => (<Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></Icon>)
export const IcServer      = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></Icon>)
export const IcWifi        = (p) => (<Icon {...p}><path d="M2 8.5C5 6 8.3 4.7 12 4.7S19 6 22 8.5M5 12c4-3.4 10-3.4 14 0M8 15.5c2.4-2 5.6-2 8 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></Icon>)
export const IcBattery     = (p) => (<Icon {...p}><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><rect x="4" y="9" width="9" height="6" rx="1" fill="currentColor" stroke="none"/></Icon>)
export const IcUser        = (p) => (<Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>)
export const IcUsersGrp    = (p) => (<Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 20a6 6 0 0 0-3-5.2"/></Icon>)
export const IcChat        = (p) => (<Icon {...p}><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></Icon>)
export const IcMail        = (p) => (<Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>)
export const IcHandshake   = (p) => (<Icon {...p}><path d="M2 12l4-4 6 3 6-3 4 4"/><path d="M6 8l4 5 2-1 2 1 4-5"/><path d="M10 13l2 2 2-2"/></Icon>)
export const IcSmile       = (p) => (<Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none"/><path d="M8.5 14.5a5 5 0 0 0 7 0"/></Icon>)
export const IcBaby        = (p) => (<Icon {...p}><circle cx="12" cy="7" r="4"/><path d="M9 7h.01M15 7h.01M10.5 9a2 2 0 0 0 3 0"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/></Icon>)
export const IcSun         = (p) => (<Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></Icon>)
export const IcCloud       = (p) => (<Icon {...p}><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4 4 0 0 1 17 18z"/></Icon>)
export const IcRain        = (p) => (<Icon {...p}><path d="M7 14a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4 4 0 0 1 17 14z"/><path d="M8 18v2M12 18v3M16 18v2"/></Icon>)
export const IcSnow        = (p) => (<Icon {...p}><path d="M12 2v20M4 7l16 10M20 7L4 17"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/></Icon>)
export const IcTree        = (p) => (<Icon {...p}><path d="M12 2l5 7h-3l4 6H6l4-6H7z"/><path d="M12 15v6"/></Icon>)
export const IcFlower      = (p) => (<Icon {...p}><circle cx="12" cy="12" r="2.5"/><path d="M12 9.5c0-3 4-4 4-1.5M14.5 12c3 0 4 4 1.5 4M12 14.5c0 3-4 4-4 1.5M9.5 12c-3 0-4-4-1.5-4"/><path d="M12 14.5V21"/></Icon>)
export const IcMountain    = (p) => (<Icon {...p}><path d="M3 20l6-12 4 7 2-3 6 8z"/><path d="M9 8l2 3"/></Icon>)
export const IcWave        = (p) => (<Icon {...p}><path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></Icon>)
export const IcFire        = (p) => (<Icon {...p}><path d="M12 3s5 4 5 9a5 5 0 1 1-10 0c0-2 1-3.5 2-4 0 2 1 3 2 3 0-3 1-5 1-8z"/></Icon>)
export const IcBolt        = (p) => (<Icon {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></Icon>)
export const IcMusic       = (p) => (<Icon {...p}><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></Icon>)
export const IcCamera      = (p) => (<Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/></Icon>)
export const IcBookOpen    = (p) => (<Icon {...p}><path d="M4 4h7a2 2 0 0 1 1 1v15a2 2 0 0 0-1-1H4z"/><path d="M20 4h-7a2 2 0 0 0-1 1v15a2 2 0 0 1 1-1h7z"/></Icon>)
export const IcGame        = (p) => (<Icon {...p}><rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 11v2M6 12h2"/><circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none"/><circle cx="18" cy="13" r="0.9" fill="currentColor" stroke="none"/></Icon>)
export const IcPalette     = (p) => (<Icon {...p}><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2.5-2H18a3 3 0 0 0 3-3c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/></Icon>)
export const IcFilm        = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></Icon>)
export const IcHeadphones  = (p) => (<Icon {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></Icon>)
export const IcMic         = (p) => (<Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></Icon>)
export const IcGlobe       = (p) => (<Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></Icon>)
export const IcMapPin      = (p) => (<Icon {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></Icon>)
export const IcAlarm       = (p) => (<Icon {...p}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M5 4L2 7M19 4l3 3"/></Icon>)
export const IcGift2       = (p) => (<Icon {...p}><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/><path d="M12 8C10 5 7 5 7 7s2 2 5 1zM12 8c2-3 5-3 5-1s-2 2-5 1z"/></Icon>)
export const IcRing        = (p) => (<Icon {...p}><circle cx="12" cy="15" r="6"/><path d="M9 9l3-6 3 6"/></Icon>)
export const IcShield      = (p) => (<Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></Icon>)
export const IcGlasses     = (p) => (<Icon {...p}><circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M3.5 12c1.5-1 3.5-1 5-0.5M10.5 13.5a2 2 0 0 1 3 0M17.5 12c1.5-1 3.5-1 5-0.5" strokeWidth="1.2"/><path d="M7 10.5V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.5"/></Icon>)
export const IcCross       = (p) => (<Icon {...p}><path d="M12 2v20"/><path d="M4 8h16"/></Icon>)
export const IcPray        = (p) => (<Icon {...p}><path d="M12 3l1.5 4.5h-3z"/><path d="M12 7.5V21"/><path d="M6 12.5l6-5 6 5"/></Icon>)

// ── Icon catalog — 110 icons with Polish labels & groups ──────────────────────
export const ICON_CATALOG = [
  { key: 'IcWallet',      label: 'portfel',      group: 'Finanse',              Component: IcWallet },
  { key: 'IcCoins',       label: 'monety',       group: 'Finanse',              Component: IcCoins },
  { key: 'IcChart',       label: 'wykres',       group: 'Finanse',              Component: IcChart },
  { key: 'IcPieChart',    label: 'kołowy',       group: 'Finanse',              Component: IcPieChart },
  { key: 'IcReceipt',     label: 'paragon',      group: 'Finanse',              Component: IcReceipt },
  { key: 'IcTarget',      label: 'cel',          group: 'Finanse',              Component: IcTarget },
  { key: 'IcScale',       label: 'waga',         group: 'Finanse',              Component: IcScale },
  { key: 'IcPercent',     label: 'procent',      group: 'Finanse',              Component: IcPercent },
  { key: 'IcVault',       label: 'sejf',         group: 'Finanse',              Component: IcVault },
  { key: 'IconSavings',   label: 'oszczędności', group: 'Finanse',              Component: IconSavings },
  { key: 'IconBank',      label: 'bank',         group: 'Finanse',              Component: IconBank },
  { key: 'IconCash',      label: 'gotówka',      group: 'Finanse',              Component: IconCash },
  { key: 'IconCard',      label: 'karta',        group: 'Finanse',              Component: IconCard },

  { key: 'IcSofa',        label: 'sofa',         group: 'Dom i przedmioty',     Component: IcSofa },
  { key: 'IcBed',         label: 'łóżko',        group: 'Dom i przedmioty',     Component: IcBed },
  { key: 'IcLamp',        label: 'lampa',        group: 'Dom i przedmioty',     Component: IcLamp },
  { key: 'IcKey',         label: 'klucz',        group: 'Dom i przedmioty',     Component: IcKey },
  { key: 'IcDoor',        label: 'drzwi',        group: 'Dom i przedmioty',     Component: IcDoor },
  { key: 'IcWashing',     label: 'pralka',       group: 'Dom i przedmioty',     Component: IcWashing },
  { key: 'IcPlant',       label: 'roślina',      group: 'Dom i przedmioty',     Component: IcPlant },
  { key: 'IcBroom',       label: 'miotła',       group: 'Dom i przedmioty',     Component: IcBroom },
  { key: 'IcTools',       label: 'narzędzia',    group: 'Dom i przedmioty',     Component: IcTools },
  { key: 'IcThermo',      label: 'termometr',    group: 'Dom i przedmioty',     Component: IcThermo },
  { key: 'IconHome',      label: 'dom',          group: 'Dom i przedmioty',     Component: IconHome },

  { key: 'IcPizza',       label: 'pizza',        group: 'Jedzenie',             Component: IcPizza },
  { key: 'IcBurger',      label: 'burger',       group: 'Jedzenie',             Component: IcBurger },
  { key: 'IcApple',       label: 'jabłko',       group: 'Jedzenie',             Component: IcApple },
  { key: 'IcWine',        label: 'wino',         group: 'Jedzenie',             Component: IcWine },
  { key: 'IcCup',         label: 'kubek',        group: 'Jedzenie',             Component: IcCup },
  { key: 'IcIceCream',    label: 'lody',         group: 'Jedzenie',             Component: IcIceCream },
  { key: 'IcCake',        label: 'ciasto',       group: 'Jedzenie',             Component: IcCake },
  { key: 'IcFish',        label: 'ryba',         group: 'Jedzenie',             Component: IcFish },
  { key: 'IcEgg',         label: 'jajko',        group: 'Jedzenie',             Component: IcEgg },
  { key: 'IcBread',       label: 'chleb',        group: 'Jedzenie',             Component: IcBread },
  { key: 'IconCoffee',    label: 'kawa',         group: 'Jedzenie',             Component: IconCoffee },

  { key: 'IcCar',         label: 'samochód',     group: 'Transport',            Component: IcCar },
  { key: 'IcBus',         label: 'autobus',      group: 'Transport',            Component: IcBus },
  { key: 'IcTrain',       label: 'pociąg',       group: 'Transport',            Component: IcTrain },
  { key: 'IcPlane',       label: 'samolot',      group: 'Transport',            Component: IcPlane },
  { key: 'IcBike',        label: 'rower',        group: 'Transport',            Component: IcBike },
  { key: 'IcScooter',     label: 'hulajnoga',    group: 'Transport',            Component: IcScooter },
  { key: 'IcShip',        label: 'statek',       group: 'Transport',            Component: IcShip },
  { key: 'IcRocket',      label: 'rakieta',      group: 'Transport',            Component: IcRocket },
  { key: 'IcTaxi',        label: 'taksówka',     group: 'Transport',            Component: IcTaxi },
  { key: 'IcParking',     label: 'parking',      group: 'Transport',            Component: IcParking },
  { key: 'IconFuel',      label: 'paliwo',       group: 'Transport',            Component: IconFuel },

  { key: 'IcPill',        label: 'tabletka',     group: 'Zdrowie i ciało',      Component: IcPill },
  { key: 'IcHeartbeat',   label: 'puls',         group: 'Zdrowie i ciało',      Component: IcHeartbeat },
  { key: 'IcStethoscope', label: 'stetoskop',    group: 'Zdrowie i ciało',      Component: IcStethoscope },
  { key: 'IcTooth',       label: 'ząb',          group: 'Zdrowie i ciało',      Component: IcTooth },
  { key: 'IcDumbbell',    label: 'hantle',       group: 'Zdrowie i ciało',      Component: IcDumbbell },
  { key: 'IcYoga',        label: 'joga',         group: 'Zdrowie i ciało',      Component: IcYoga },
  { key: 'IcBrain',       label: 'mózg',         group: 'Zdrowie i ciało',      Component: IcBrain },
  { key: 'IcLeaf',        label: 'liść',         group: 'Zdrowie i ciało',      Component: IcLeaf },
  { key: 'IcDrop',        label: 'kropla',       group: 'Zdrowie i ciało',      Component: IcDrop },
  { key: 'IcMoon',        label: 'księżyc',      group: 'Zdrowie i ciało',      Component: IcMoon },

  { key: 'IcBriefcase',   label: 'teczka',       group: 'Praca i technologia',  Component: IcBriefcase },
  { key: 'IcLaptop',      label: 'laptop',       group: 'Praca i technologia',  Component: IcLaptop },
  { key: 'IcPhoneDev',    label: 'telefon',      group: 'Praca i technologia',  Component: IcPhoneDev },
  { key: 'IcMonitor',     label: 'monitor',      group: 'Praca i technologia',  Component: IcMonitor },
  { key: 'IcCode',        label: 'kod',          group: 'Praca i technologia',  Component: IcCode },
  { key: 'IcKeyboard',    label: 'klawiatura',   group: 'Praca i technologia',  Component: IcKeyboard },
  { key: 'IcServer',      label: 'serwer',       group: 'Praca i technologia',  Component: IcServer },
  { key: 'IcWifi',        label: 'wifi',         group: 'Praca i technologia',  Component: IcWifi },
  { key: 'IcBattery',     label: 'bateria',      group: 'Praca i technologia',  Component: IcBattery },
  { key: 'IconSearch',    label: 'szukaj',       group: 'Praca i technologia',  Component: IconSearch },

  { key: 'IcUser',        label: 'osoba',        group: 'Ludzie i społeczność', Component: IcUser },
  { key: 'IcUsersGrp',    label: 'ludzie',       group: 'Ludzie i społeczność', Component: IcUsersGrp },
  { key: 'IcChat',        label: 'czat',         group: 'Ludzie i społeczność', Component: IcChat },
  { key: 'IcMail',        label: 'mail',         group: 'Ludzie i społeczność', Component: IcMail },
  { key: 'IcHandshake',   label: 'uścisk',       group: 'Ludzie i społeczność', Component: IcHandshake },
  { key: 'IcSmile',       label: 'uśmiech',      group: 'Ludzie i społeczność', Component: IcSmile },
  { key: 'IcBaby',        label: 'dziecko',      group: 'Ludzie i społeczność', Component: IcBaby },
  { key: 'IcRing',        label: 'pierścionek',  group: 'Ludzie i społeczność', Component: IcRing },
  { key: 'IconHeart',     label: 'serce',        group: 'Ludzie i społeczność', Component: IconHeart },
  { key: 'IcGlasses',     label: 'okulary',      group: 'Ludzie i społeczność', Component: IcGlasses },

  { key: 'IcSun',         label: 'słońce',       group: 'Natura i pogoda',      Component: IcSun },
  { key: 'IcCloud',       label: 'chmura',       group: 'Natura i pogoda',      Component: IcCloud },
  { key: 'IcRain',        label: 'deszcz',       group: 'Natura i pogoda',      Component: IcRain },
  { key: 'IcSnow',        label: 'śnieg',        group: 'Natura i pogoda',      Component: IcSnow },
  { key: 'IcTree',        label: 'drzewo',       group: 'Natura i pogoda',      Component: IcTree },
  { key: 'IcFlower',      label: 'kwiat',        group: 'Natura i pogoda',      Component: IcFlower },
  { key: 'IcMountain',    label: 'góra',         group: 'Natura i pogoda',      Component: IcMountain },
  { key: 'IcWave',        label: 'fala',         group: 'Natura i pogoda',      Component: IcWave },
  { key: 'IcFire',        label: 'ogień',        group: 'Natura i pogoda',      Component: IcFire },
  { key: 'IcBolt',        label: 'błyskawica',   group: 'Natura i pogoda',      Component: IcBolt },

  { key: 'IcMusic',       label: 'muzyka',       group: 'Aktywności i hobby',   Component: IcMusic },
  { key: 'IcCamera',      label: 'aparat',       group: 'Aktywności i hobby',   Component: IcCamera },
  { key: 'IcBookOpen',    label: 'książka',      group: 'Aktywności i hobby',   Component: IcBookOpen },
  { key: 'IcGame',        label: 'gra',          group: 'Aktywności i hobby',   Component: IcGame },
  { key: 'IcPalette',     label: 'paleta',       group: 'Aktywności i hobby',   Component: IcPalette },
  { key: 'IcFilm',        label: 'film',         group: 'Aktywności i hobby',   Component: IcFilm },
  { key: 'IcHeadphones',  label: 'słuchawki',    group: 'Aktywności i hobby',   Component: IcHeadphones },
  { key: 'IcMic',         label: 'mikrofon',     group: 'Aktywności i hobby',   Component: IcMic },
  { key: 'IconStar',      label: 'gwiazda',      group: 'Aktywności i hobby',   Component: IconStar },
  { key: 'IconShopping',  label: 'zakupy',       group: 'Aktywności i hobby',   Component: IconShopping },
  { key: 'IconClothing',  label: 'ubrania',      group: 'Aktywności i hobby',   Component: IconClothing },

  { key: 'IconMore',      label: 'inne',         group: 'Interfejs i różne',    Component: IconMore },
  { key: 'IconTag',       label: 'etykieta',     group: 'Interfejs i różne',    Component: IconTag },
  { key: 'IconBell',      label: 'dzwonek',      group: 'Interfejs i różne',    Component: IconBell },
  { key: 'IcAlarm',       label: 'budzik',       group: 'Interfejs i różne',    Component: IcAlarm },
  { key: 'IconCalendar',  label: 'kalendarz',    group: 'Interfejs i różne',    Component: IconCalendar },
  { key: 'IcShield',      label: 'tarcza',       group: 'Interfejs i różne',    Component: IcShield },
  { key: 'IcGlobe',       label: 'globus',       group: 'Interfejs i różne',    Component: IcGlobe },
  { key: 'IcMapPin',      label: 'pinezka',      group: 'Interfejs i różne',    Component: IcMapPin },
  { key: 'IconFlag',      label: 'flaga',        group: 'Interfejs i różne',    Component: IconFlag },
  { key: 'IconRepeat',    label: 'cyklicznie',   group: 'Interfejs i różne',    Component: IconRepeat },
  { key: 'IcCross',       label: 'krzyż',        group: 'Interfejs i różne',    Component: IcCross },
  { key: 'IcPray',        label: 'modlitwa',     group: 'Interfejs i różne',    Component: IcPray },
  { key: 'IconSettings',  label: 'ustawienia',   group: 'Interfejs i różne',    Component: IconSettings },
  { key: 'IcGift2',       label: 'prezent',      group: 'Interfejs i różne',    Component: IcGift2 },
]

// Key → Component lookup (for CatIcon)
const ICON_KEY_MAP = Object.fromEntries(ICON_CATALOG.map(ic => [ic.key, ic.Component]))

// Map from category id → SVG component
export const CATEGORY_ICON_MAP = {
  // Budget — expenses
  jedzenie: IcPizza,
  kawa: IcCup,
  miasto: IcCup,
  zakupy: IconShopping,
  transport: IcBus,
  auto: IcCar,
  dom: IcSofa,
  paliwo: IcCar,
  zdrowie: IcPill,
  praca: IcBriefcase,
  firma: IcBriefcase,
  rachunki: IcReceipt,
  edukacja: IcBookOpen,
  studia: IcBookOpen,
  rozrywka: IcFilm,
  przyjemnosci: IcFilm,
  prezenty: IcGift2,
  prezent: IcGift2,
  ubrania: IconClothing,
  subskrypcje: IconRepeat,
  wyjazdy: IcPlane,
  oszczednosci: IcVault,
  dziesiecina: IcCross,
  ofiara: IcCross,
  wynagrodzenie: IcBriefcase,
  freelance: IcLaptop,
  premia: IcBriefcase,
  zwrot: IconTransfer,
  inwestycje: IcChart,
  inne: IconMore,
  restauracje: IcPizza,
  sport: IcDumbbell,
  zwierzeta: IconHeart,
  naprawy: IcTools,
  kosmetyki: IcDrop,
  alkohol: IcWine,
  elektronika: IcLaptop,
  ksiazki: IcBookOpen,
  wynajem: IcKey,
  // Habit categories (English IDs)
  health: IcDumbbell,
  spirit: IcPray,
  learn: IcBookOpen,
  work: IcBriefcase,
  other: IconMore,
  // Prayer categories
  personal: IcPray,
  family: IcUsersGrp,
  others: IcUsersGrp,
  thanks: IconStar,
  spiritual: IcPray,
  general: IconMore,
  // Calendar slugs
  home: IcSofa,
  birthday: IcCake,
  study: IcBookOpen,
  meeting: IcHandshake,
  finance: IcWallet,
  prayer: IcPray,
  travel: IcPlane,
}

// Renders SVG icon for a category — checks ID map, then icon-key map, then emoji fallback
export function CatIcon({ categoryId, emoji, size = 18, style }) {
  const Comp = CATEGORY_ICON_MAP[categoryId] || ICON_KEY_MAP[emoji]
  if (Comp) return <Comp size={size} style={style} />
  if (emoji) return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{emoji}</span>
  return <span style={{ fontSize: size, lineHeight: 1, opacity: 0.4, ...style }}>·</span>
}
