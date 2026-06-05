// Plutchik Emotion Wheel — simplified for readability
// Only middle ring has text labels (no tiny inner/outer labels)

const N = 8
const STEP = (2 * Math.PI) / N

// Radii — tighter to allow larger text
const RI = 46, R1 = 95, R2 = 158, RO = 208, RB = 240

export const EMOTIONS = [
  { id: 'radość',      label: 'Radość',      colors: ['#ffe44d','#ffd400','#c9a800'] },
  { id: 'zaufanie',    label: 'Zaufanie',    colors: ['#6fe87a','#3ecb4c','#259c32'] },
  { id: 'strach',      label: 'Strach',      colors: ['#a078e8','#7c4fd4','#5b2db0'] },
  { id: 'zaskoczenie', label: 'Zaskoczenie', colors: ['#7ecef4','#44aee8','#1e7fc0'] },
  { id: 'smutek',      label: 'Smutek',      colors: ['#6ea8d8','#3d7bbf','#1d509a'] },
  { id: 'wstręt',      label: 'Wstręt',      colors: ['#8fbf55','#6ba02e','#4a7518'] },
  { id: 'złość',       label: 'Złość',       colors: ['#ff7252','#f43b12','#c0220a'] },
  { id: 'oczekiwanie', label: 'Oczekiwanie', colors: ['#ffb347','#f48b00','#c06600'] },
]

// Blends: k=0 → boundary between em[0] and em[1], k=7 → em[7] and em[0]
export const BLENDS = [
  { id: 'miłość',        label: 'Miłość',        color: '#a8e87a', k: 0 },
  { id: 'uległość',      label: 'Uległość',       color: '#7cb8e0', k: 1 },
  { id: 'przerażenie',   label: 'Przerażenie',    color: '#8856d8', k: 2 },
  { id: 'rozczarowanie', label: 'Rozczarowanie',  color: '#5596cc', k: 3 },
  { id: 'wyrzuty',       label: 'Wyrzuty',        color: '#6aaa40', k: 4 },
  { id: 'pogarda',       label: 'Pogarda',         color: '#a8c040', k: 5 },
  { id: 'agresja',       label: 'Agresja',         color: '#f87030', k: 6 },
  { id: 'optymizm',      label: 'Optymizm',        color: '#f5d040', k: 7 },
]

export const ALL_EMOTIONS = [
  ...EMOTIONS.map(e => ({ id: e.id, label: e.label, color: e.colors[1] })),
  ...BLENDS.map(b => ({ id: b.id, label: b.label, color: b.color })),
]

// ── helpers ──────────────────────────────────────────────────────────────────

function sector(r1, r2, startA, endA, gap = 0.024) {
  const a0 = startA + gap, a1 = endA - gap
  const c0 = Math.cos(a0), s0 = Math.sin(a0)
  const c1 = Math.cos(a1), s1 = Math.sin(a1)
  const large = (a1 - a0) > Math.PI ? 1 : 0
  return `M${c0*r1},${s0*r1}L${c0*r2},${s0*r2}A${r2},${r2} 0 ${large} 1 ${c1*r2},${s1*r2}L${c1*r1},${s1*r1}A${r1},${r1} 0 ${large} 0 ${c0*r1},${s0*r1}Z`
}

function Txt({ r, angle, size, children, op = 0.92, bold }) {
  const x = Math.cos(angle) * r, y = Math.sin(angle) * r
  const deg = angle * 180 / Math.PI + 90
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={size} fill={`rgba(255,255,255,${op})`}
      fontFamily="'Space Grotesk',system-ui,sans-serif"
      fontWeight={bold ? '600' : '500'}
      letterSpacing="0.01em"
      transform={`rotate(${deg},${x},${y})`}
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {children}
    </text>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmotionWheel({ selected = new Set(), onToggle }) {
  const hasSelected = selected.size > 0

  return (
    <svg viewBox="-255 -255 510 510"
      style={{ width: '100%', maxWidth: 380, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* ── Primary emotions ── */}
      {EMOTIONS.map((em, i) => {
        const startA = i * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        const active  = selected.has(em.id)
        const opacity = hasSelected ? (active ? 1 : 0.18) : 1

        return (
          <g key={em.id} onClick={() => onToggle(em.id)}
            style={{ cursor: 'pointer', opacity, transition: 'opacity .2s' }}>

            {/* Outer band — lightest, no text */}
            <path d={sector(R2, RO, startA, endA)} fill={em.colors[0]}
              style={{ filter: active ? 'brightness(1.25)' : 'none', transition: 'filter .2s' }} />

            {/* Middle band — main color + NAME (readable!) */}
            <path d={sector(R1, R2, startA, endA)} fill={em.colors[1]}
              style={{ filter: active ? 'brightness(1.25)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(R1+R2)/2} angle={midA} size={11} bold>{em.label}</Txt>

            {/* Inner band — darkest, no text */}
            <path d={sector(RI, R1, startA, endA)} fill={em.colors[2]}
              style={{ filter: active ? 'brightness(1.25)' : 'none', transition: 'filter .2s' }} />
          </g>
        )
      })}

      {/* ── Blend ring — outermost thin band ── */}
      {BLENDS.map(bl => {
        const startA = (bl.k + 0.5) * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        const active  = selected.has(bl.id)
        const opacity = hasSelected ? (active ? 1 : 0.1) : 0.75

        return (
          <g key={bl.id} onClick={() => onToggle(bl.id)}
            style={{ cursor: 'pointer', opacity, transition: 'opacity .2s' }}>
            <path d={sector(RO, RB, startA, endA, 0.026)} fill={bl.color}
              style={{ filter: active ? 'brightness(1.3)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(RO+RB)/2} angle={midA} size={7} op={0.85}>{bl.label}</Txt>
          </g>
        )
      })}

      {/* ── Active selection glow ring ── */}
      {hasSelected && EMOTIONS.filter(e => selected.has(e.id)).map((em, i) => {
        const idx    = EMOTIONS.indexOf(em)
        const startA = idx * STEP - Math.PI / 2
        const endA   = startA + STEP
        return (
          <path key={'glow'+em.id}
            d={sector(RI - 1, RO + 1, startA, endA, 0.015)}
            fill="none"
            stroke={em.colors[1]}
            strokeWidth="3"
            opacity="0.5"
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* ── Center ── */}
      <circle cx={0} cy={0} r={RI - 3}
        fill="#0c0d12" stroke="rgba(255,255,255,0.07)" strokeWidth={1}
        onClick={() => hasSelected && onToggle(null)}
        style={{ cursor: hasSelected ? 'pointer' : 'default' }} />
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
        fontSize={9} fill="rgba(255,255,255,0.32)"
        fontFamily="'Space Grotesk',system-ui,sans-serif"
        letterSpacing="0.12em"
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {hasSelected ? '✕ WYCZYŚĆ' : 'EMOCJE'}
      </text>
    </svg>
  )
}
