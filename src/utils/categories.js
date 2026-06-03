export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'jedzenie',      label: 'Jedzenie',       icon: '🍕', color: '#C97A55' },
  { id: 'kawa',          label: 'Kawa / Cafe',     icon: '☕', color: '#A07B4F' },
  { id: 'restauracje',   label: 'Restauracje',     icon: '🍽️', color: '#C97A55' },
  { id: 'zakupy',        label: 'Zakupy',          icon: '🛒', color: '#D4A574' },
  { id: 'ubrania',       label: 'Ubrania',         icon: '👕', color: '#9B8FA8' },
  { id: 'transport',     label: 'Transport',       icon: '🚌', color: '#9AAFB8' },
  { id: 'auto',          label: 'Auto',            icon: '🚗', color: '#7A9E9A' },
  { id: 'paliwo',        label: 'Paliwo',          icon: '⛽', color: '#E0B570' },
  { id: 'dom',           label: 'Dom',             icon: '🏠', color: '#8A7E72' },
  { id: 'rachunki',      label: 'Rachunki',        icon: '📄', color: '#BAAE99' },
  { id: 'naprawy',       label: 'Naprawy',         icon: '🔧', color: '#A07B4F' },
  { id: 'zdrowie',       label: 'Zdrowie',         icon: '💊', color: '#A8B5A0' },
  { id: 'kosmetyki',     label: 'Kosmetyki',       icon: '💄', color: '#B89090' },
  { id: 'sport',         label: 'Sport',           icon: '🏃', color: '#A8B5A0' },
  { id: 'rozrywka',      label: 'Rozrywka',        icon: '🎬', color: '#C97A55' },
  { id: 'ksiazki',       label: 'Książki',         icon: '📚', color: '#9AAFB8' },
  { id: 'edukacja',      label: 'Edukacja',        icon: '🎓', color: '#9AAFB8' },
  { id: 'elektronika',   label: 'Elektronika',     icon: '💻', color: '#7A9E9A' },
  { id: 'subskrypcje',   label: 'Subskrypcje',     icon: '🔄', color: '#8A7E72' },
  { id: 'wyjazdy',       label: 'Wyjazdy',         icon: '✈️', color: '#E0B570' },
  { id: 'prezenty',      label: 'Prezenty',        icon: '🎁', color: '#D4A574' },
  { id: 'zwierzeta',     label: 'Zwierzęta',       icon: '🐾', color: '#A8B5A0' },
  { id: 'praca',         label: 'Praca',           icon: '💼', color: '#BAAE99' },
  { id: 'firma',         label: 'Firma',           icon: '🏢', color: '#9AAFB8' },
  { id: 'dziesiecina',   label: 'Dziesięcina',     icon: '⛪', color: '#C97A55' },
  { id: 'ofiara',        label: 'Ofiara / Datek',  icon: '🕊️', color: '#D4A574' },
  { id: 'oszczednosci',  label: 'Oszczędności',    icon: '🏦', color: '#A8B5A0' },
  { id: 'inne',          label: 'Inne',            icon: '📌', color: '#7A6E5C' },
]

export const DEFAULT_INCOME_CATEGORIES = [
  { id: 'wynagrodzenie', label: 'Wynagrodzenie',   icon: '💼', color: '#A8B5A0' },
  { id: 'freelance',     label: 'Freelance',       icon: '💻', color: '#A8B5A0' },
  { id: 'premia',        label: 'Premia',          icon: '⭐', color: '#E0B570' },
  { id: 'zwrot',         label: 'Zwrot',           icon: '↩️', color: '#9AAFB8' },
  { id: 'prezent',       label: 'Prezent',         icon: '🎁', color: '#D4A574' },
  { id: 'inwestycje',    label: 'Inwestycje',      icon: '📈', color: '#A8B5A0' },
  { id: 'wynajem',       label: 'Wynajem',         icon: '🏠', color: '#C97A55' },
  { id: 'sprzedaz',      label: 'Sprzedaż',        icon: '🛒', color: '#D4A574' },
  { id: 'stypendium',    label: 'Stypendium',      icon: '🎓', color: '#9AAFB8' },
  { id: 'inne',          label: 'Inne',            icon: '📌', color: '#7A6E5C' },
]

export const CAT_COLORS = [
  '#C97A55','#A07B4F','#D4A574','#A8B5A0','#9AAFB8',
  '#E0B570','#9B8FA8','#B89090','#7A9E9A','#8A7E72',
  '#BAAE99','#7A6E5C','#C94B28','#E05A2B','#F97316',
  '#F59E0B','#84CC16','#22C55E','#10B981','#14B8A6',
  '#06B6D4','#3B82F6','#6366F1','#8B5CF6','#A855F7',
  '#EC4899','#F43F5E','#64748B','#059669','#DC2626',
]

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function getSubcategoryColor(parentHex, index) {
  if (!parentHex?.startsWith('#')) return parentHex || '#888'
  const [h, s, l] = hexToHsl(parentHex)
  const offsets = [15, -12, 23, -19, 9, -6, 18, -8]
  const newL = Math.min(88, Math.max(22, l + offsets[index % offsets.length]))
  return hslToHex(h, s, newL)
}
