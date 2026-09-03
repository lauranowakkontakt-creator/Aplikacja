import { tokenizeDreamText } from '../../utils/dreams'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

// Drobiazgi wspólne dla widoków Snu: dzisiejsza data, „pigułka" symbolu
// i tekst snu z podświetlonymi osobami (@) oraz symbolami (#).

export const fmtDate = (d, withYear = true) => {
  try { return format(parseISO(d), withYear ? 'd MMM yyyy' : 'd MMM', { locale: pl }) }
  catch { return d }
}


export const TODAY = () => format(new Date(), 'yyyy-MM-dd')


export const Chip = ({ color, children, onClick, active }) => (
  <span onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
    padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
    border: `1px solid ${active ? color : color + '44'}`,
    background: active ? color + '22' : color + '12', color,
    cursor: onClick ? 'pointer' : 'default',
  }}>{children}</span>
)

// Pigułka symbolu — z prefiksem #
export const SymbolChip = ({ symbol, onClick }) => (
  <Chip color={symbol.color || '#5BB6D9'} onClick={onClick}>
    <span style={{ opacity: 0.65 }}>#</span>{symbol.name}
  </Chip>
)

/* Treść snu: osoby (@Imię) i symbole (#nazwa) podświetlone kolorem, BEZ prefiksu.
   Podświetlanie opiera się na znacznikach @/# i jawnym powiązaniu (id), a nie na
   zgadywaniu po nazwie — patrz tokenizeDreamText. */
export function DreamText({ text, highlightPeople = [], highlightSymbols = [], onOpenSymbol }) {
  if (!text) return null
  const segs = tokenizeDreamText(text, highlightPeople, highlightSymbols)
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
      {segs.map((s, i) => {
        if (s.kind === 'plain') return <span key={i}>{s.t}</span>
        const color = s.color || (s.kind === 'person' ? 'var(--accent)' : '#5BB6D9')
        const clickable = s.kind === 'symbol' && s.id && onOpenSymbol
        return (
          <span key={i}
            onClick={clickable ? () => onOpenSymbol(s.id) : undefined}
            style={{
              color, fontWeight: 600, whiteSpace: 'nowrap',
              textDecoration: 'underline', textDecorationColor: color,
              textUnderlineOffset: 2, textDecorationThickness: '1px',
              cursor: clickable ? 'pointer' : 'inherit',
            }}>{s.t}</span>
        )
      })}
    </p>
  )
}
