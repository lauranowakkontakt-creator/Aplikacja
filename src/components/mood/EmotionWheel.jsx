// Plutchik Emotion Wheel — interactive SVG, multi-select
// 8 primary emotions × 3 rings (light=high intensity, dark=low) + 8 blends

const N = 8
const STEP = (2 * Math.PI) / N
const RI = 48, R1 = 100, R2 = 155, RO = 210, RB = 244

// Primary emotions (clockwise from 12 o'clock)
export const EMOTIONS = [
  { id: 'radość',      label: 'Radość',      colors: ['#ffe44d','#ffd400','#c9a800'], intensity: ['Spokój',       'Radość',       'Ekstaza'] },
  { id: 'zaufanie',    label: 'Zaufanie',    colors: ['#6fe87a','#3ecb4c','#259c32'], intensity: ['Akceptacja',  'Zaufanie',     'Zachwyt'] },
  { id: 'strach',      label: 'Strach',      colors: ['#a078e8','#7c4fd4','#5b2db0'], intensity: ['Niepokój',    'Strach',       'Terror'] },
  { id: 'zaskoczenie', label: 'Zaskoczenie', colors: ['#7ecef4','#44aee8','#1e7fc0'], intensity: ['Zdziwienie',  'Zaskoczenie',  'Zdumienie'] },
  { id: 'smutek',      label: 'Smutek',      colors: ['#6ea8d8','#3d7bbf','#1d509a'], intensity: ['Zamyślenie',  'Smutek',       'Żałoba'] },
  { id: 'wstręt',      label: 'Wstręt',      colors: ['#8fbf55','#6ba02e','#4a7518'], intensity: ['Znudzenie',   'Wstręt',       'Odraza'] },
  { id: 'złość',       label: 'Złość',       colors: ['#ff7252','#f43b12','#c0220a'], intensity: ['Irytacja',    'Złość',        'Wściekłość'] },
  { id: 'oczekiwanie', label: 'Oczekiwanie', colors: ['#ffb347','#f48b00','#c06600'], intensity: ['Zainteresowanie','Oczekiwanie','Czujność'] },
]

// Blended emotions — positioned at boundaries between primaries (k=0 → Joy∩Trust, k=7 → Anticipation∩Joy)
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

// Flat list of all selectable emotions with label + color
export const ALL_EMOTIONS = [
  ...EMOTIONS.map(e => ({ id: e.id, label: e.label, color: e.colors[1] })),
  ...BLENDS.map(b => ({ id: b.id, label: b.label, color: b.color })),
]

// ── SVG helpers ──────────────────────────────────────────────────────────────

function sector(r1, r2, startA, endA, gap = 0.022) {
  const a0 = startA + gap, a1 = endA - gap
  const c0 = Math.cos(a0), s0 = Math.sin(a0)
  const c1 = Math.cos(a1), s1 = Math.sin(a1)
  const large = (a1 - a0) > Math.PI ? 1 : 0
  return `M${c0*r1},${s0*r1}L${c0*r2},${s0*r2}A${r2},${r2} 0 ${large} 1 ${c1*r2},${s1*r2}L${c1*r1},${s1*r1}A${r1},${r1} 0 ${large} 0 ${c0*r1},${s0*r1}Z`
}

function Txt({ r, angle, size, children, op = 0.88 }) {
  const x = Math.cos(angle) * r, y = Math.sin(angle) * r
  const deg = angle * 180 / Math.PI + 90
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={size} fill={`rgba(255,255,255,${op})`}
      fontFamily="'Space Grotesk',system-ui,sans-serif" fontWeight="500"
      letterSpacing="0.02em"
      transform={`rotate(${deg},${x},${y})`}
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {children}
    </text>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmotionWheel({ selected = new Set(), onToggle }) {
  const hasSelected = selected.size > 0

  return (
    <svg viewBox="-260 -260 520 520"
      style={{ width: '100%', maxWidth: 360, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* ── Primary emotions (3 rings each) ── */}
      {EMOTIONS.map((em, i) => {
        const startA = i * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        const active  = selected.has(em.id)
        const opacity = hasSelected ? (active ? 1 : 0.2) : 1

        return (
          <g key={em.id} onClick={() => onToggle(em.id)}
            style={{ cursor: 'pointer', opacity, transition: 'opacity .2s' }}>

            {/* Outer ring — light color, highest intensity */}
            <path d={sector(R2, RO, startA, endA)} fill={em.colors[0]}
              style={{ filter: active ? 'brightness(1.3)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(R2+RO)/2} angle={midA} size={6.5} op={0.65}>{em.intensity[2]}</Txt>

            {/* Mid ring — main color, primary name */}
            <path d={sector(R1, R2, startA, endA)} fill={em.colors[1]}
              style={{ filter: active ? 'brightness(1.3)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(R1+R2)/2} angle={midA} size={9}>{em.label}</Txt>

            {/* Inner ring — dark color, lowest intensity */}
            <path d={sector(RI, R1, startA, endA)} fill={em.colors[2]}
              style={{ filter: active ? 'brightness(1.3)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(RI+R1)/2} angle={midA} size={7} op={0.7}>{em.intensity[0]}</Txt>
          </g>
        )
      })}

      {/* ── Blend ring (thin outer band between primaries) ── */}
      {BLENDS.map(bl => {
        // blend k centered at boundary between emotion[k] and emotion[(k+1)%8]
        const startA = (bl.k + 0.5) * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        const active  = selected.has(bl.id)
        const opacity = hasSelected ? (active ? 1 : 0.12) : 0.72

        return (
          <g key={bl.id} onClick={() => onToggle(bl.id)}
            style={{ cursor: 'pointer', opacity, transition: 'opacity .2s' }}>
            <path d={sector(RO, RB, startA, endA, 0.025)} fill={bl.color}
              style={{ filter: active ? 'brightness(1.35)' : 'none', transition: 'filter .2s' }} />
            <Txt r={(RO+RB)/2} angle={midA} size={5.8} op={0.8}>{bl.label}</Txt>
          </g>
        )
      })}

      {/* ── Center button — clears selection ── */}
      <circle cx={0} cy={0} r={RI - 2} fill="#0c0d12" stroke="rgba(255,255,255,0.08)" strokeWidth={1}
        onClick={() => hasSelected && onToggle(null)}
        style={{ cursor: hasSelected ? 'pointer' : 'default' }} />
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
        fontSize={8.5} fill="rgba(255,255,255,0.35)"
        fontFamily="'Space Grotesk',system-ui,sans-serif"
        letterSpacing="0.14em"
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {hasSelected ? '✕ WYCZYŚĆ' : 'EMOCJE'}
      </text>
    </svg>
  )
}
