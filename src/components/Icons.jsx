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
    <path d="M5 21V11a7 7 0 0 1 14 0v10" />
    <path d="M12 21V13" />
    <circle cx="12" cy="6" r="1.5" />
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

// Map from category id → SVG component
export const CATEGORY_ICON_MAP = {
  jedzenie: IconFood,
  kawa: IconCoffee,
  miasto: IconCoffee,
  zakupy: IconShopping,
  transport: IconTransport,
  auto: IconTransport,
  dom: IconHome,
  paliwo: IconFuel,
  zdrowie: IconHealth,
  praca: IconWork,
  firma: IconWork,
  rachunki: IconBills,
  edukacja: IconEducation,
  studia: IconEducation,
  rozrywka: IconEntertainment,
  przyjemnosci: IconEntertainment,
  prezenty: IconGift,
  prezent: IconGift,
  ubrania: IconClothing,
  subskrypcje: IconRepeat,
  wyjazdy: IconTravel,
  oszczednosci: IconSavings,
  dziesiecina: IconPrayer,
  ofiara: IconHeart,
  wynagrodzenie: IconWork,
  freelance: IconWork,
  premia: IconStar,
  zwrot: IconTransfer,
  inwestycje: IconSavings,
  inne: IconMore,
  restauracje: IconFood,
  sport: IconHealth,
  zwierzeta: IconHeart,
  naprawy: IconWork,
  kosmetyki: IconHealth,
  alkohol: IconFood,
  elektronika: IconWork,
  ksiazki: IconEducation,
}

// Renders SVG icon for a category, falls back to emoji or dot
export function CatIcon({ categoryId, emoji, size = 18, style }) {
  const Comp = CATEGORY_ICON_MAP[categoryId]
  if (Comp) return <Comp size={size} style={style} />
  if (emoji) return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{emoji}</span>
  return <span style={{ fontSize: size, lineHeight: 1, opacity: 0.4, ...style }}>·</span>
}
