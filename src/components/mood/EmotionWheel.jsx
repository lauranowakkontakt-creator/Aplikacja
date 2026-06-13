// Koło emocji Plutchika — pełna wersja:
// 8 płatków × 3 poziomy intensywności (zewn. = łagodna, środek = bazowa, wewn. = intensywna)
// + 8 emocji mieszanych na cienkim zewnętrznym pierścieniu.
// Każdy pierścień to OSOBNA emocja — klikalna i podpisana.

const N = 8
const STEP = (2 * Math.PI) / N

// Promienie pierścieni
const RI = 46, R1 = 100, R2 = 162, RO = 210, RB = 242

// 8 płatków, każdy z 3 poziomami: mild (zewn.) / base (środek) / intense (wewn.)
export const PETALS = [
  {
    mild:    { id: 'błogość',      label: 'Błogość',      color: '#F2DC8B' },
    base:    { id: 'radość',       label: 'Radość',       color: '#E6C04A' },
    intense: { id: 'euforia',      label: 'Euforia',      color: '#C79A1E' },
  },
  {
    mild:    { id: 'akceptacja',   label: 'Akceptacja',   color: '#C3E08F' },
    base:    { id: 'zaufanie',     label: 'Zaufanie',     color: '#9CCB5E' },
    intense: { id: 'podziw',       label: 'Podziw',       color: '#74A636' },
  },
  {
    mild:    { id: 'niepokój',     label: 'Niepokój',     color: '#8FD8B0' },
    base:    { id: 'strach',       label: 'Strach',       color: '#57BD8A' },
    intense: { id: 'przerażenie',  label: 'Przerażenie',  color: '#339666' },
  },
  {
    mild:    { id: 'rozproszenie', label: 'Rozproszenie', color: '#97D3F0' },
    base:    { id: 'zaskoczenie',  label: 'Zaskoczenie',  color: '#5DB6E6' },
    intense: { id: 'zdumienie',    label: 'Zdumienie',    color: '#338CC5' },
  },
  {
    mild:    { id: 'zaduma',       label: 'Zaduma',       color: '#9FB2EC' },
    base:    { id: 'smutek',       label: 'Smutek',       color: '#6E89DE' },
    intense: { id: 'rozpacz',      label: 'Rozpacz',      color: '#4763BD' },
  },
  {
    mild:    { id: 'znudzenie',    label: 'Znudzenie',    color: '#CBA4EC' },
    base:    { id: 'wstręt',       label: 'Wstręt',       color: '#A878DC' },
    intense: { id: 'odraza',       label: 'Odraza',       color: '#8050C0' },
  },
  {
    mild:    { id: 'irytacja',     label: 'Irytacja',     color: '#F49C84' },
    base:    { id: 'złość',        label: 'Złość',        color: '#E66A4E' },
    intense: { id: 'wściekłość',   label: 'Wściekłość',   color: '#C24428' },
  },
  {
    mild:    { id: 'ciekawość',    label: 'Ciekawość',    color: '#F6BE86' },
    base:    { id: 'oczekiwanie',  label: 'Oczekiwanie',  color: '#EA964B' },
    intense: { id: 'czujność',     label: 'Czujność',     color: '#C97222' },
  },
]

// Emocje mieszane: k = granica między płatkiem k i k+1
export const BLENDS = [
  { id: 'miłość',        label: 'Miłość',           color: '#C0D262', k: 0 },
  { id: 'uległość',      label: 'Uległość',         color: '#79C277', k: 1 },
  { id: 'trwoga',        label: 'Trwoga',           color: '#55BBC2', k: 2 },
  { id: 'rozczarowanie', label: 'Rozczarowanie',    color: '#7B9BE4', k: 3 },
  { id: 'wyrzuty',       label: 'Wyrzuty sumienia', color: '#8C77D2', k: 4 },
  { id: 'pogarda',       label: 'Pogarda',          color: '#C45C86', k: 5 },
  { id: 'agresja',       label: 'Agresja',          color: '#DB7A33', k: 6 },
  { id: 'optymizm',      label: 'Optymizm',         color: '#E8B040', k: 7 },
]

export const ALL_EMOTIONS = [
  ...PETALS.flatMap(p => [p.mild, p.base, p.intense]),
  ...BLENDS.map(({ id, label, color }) => ({ id, label, color })),
]

// ── helpers ──────────────────────────────────────────────────────────────────

function sector(r1, r2, startA, endA, gap = 0.024) {
  const a0 = startA + gap, a1 = endA - gap
  const c0 = Math.cos(a0), s0 = Math.sin(a0)
  const c1 = Math.cos(a1), s1 = Math.sin(a1)
  const large = (a1 - a0) > Math.PI ? 1 : 0
  return `M${c0*r1},${s0*r1}L${c0*r2},${s0*r2}A${r2},${r2} 0 ${large} 1 ${c1*r2},${s1*r2}L${c1*r1},${s1*r1}A${r1},${r1} 0 ${large} 0 ${c0*r1},${s0*r1}Z`
}

function Txt({ r, angle, size, children, op = 0.95, bold }) {
  const x = Math.cos(angle) * r, y = Math.sin(angle) * r
  const deg = angle * 180 / Math.PI + 90
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={size} fill={`rgba(16,14,10,${op})`}
      fontFamily="'Space Grotesk',system-ui,sans-serif"
      fontWeight={bold ? '700' : '600'}
      letterSpacing="0.01em"
      transform={`rotate(${deg},${x},${y})`}
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {children}
    </text>
  )
}

// Pojedynczy klikalny pierścień-emocja
function Band({ d, emotion, selected, hasSelected, onToggle, labelR, midA, labelSize, bold, lightText }) {
  const active = selected.has(emotion.id)
  const opacity = hasSelected ? (active ? 1 : 0.22) : 1
  return (
    <g onClick={() => onToggle(emotion.id)}
      style={{ cursor: 'pointer', opacity, transition: 'opacity .2s' }}>
      <path d={d} fill={emotion.color}
        stroke={active ? '#fff' : 'none'} strokeWidth={active ? 2 : 0}
        style={{ filter: active ? 'brightness(1.18)' : 'none', transition: 'filter .2s' }} />
      {lightText
        ? <text x={Math.cos(midA)*labelR} y={Math.sin(midA)*labelR} textAnchor="middle" dominantBaseline="central"
            fontSize={labelSize} fill="rgba(255,255,255,.92)"
            fontFamily="'Space Grotesk',system-ui,sans-serif" fontWeight="600" letterSpacing="0.01em"
            transform={`rotate(${midA*180/Math.PI+90},${Math.cos(midA)*labelR},${Math.sin(midA)*labelR})`}
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{emotion.label}</text>
        : <Txt r={labelR} angle={midA} size={labelSize} bold={bold}>{emotion.label}</Txt>}
    </g>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmotionWheel({ selected = new Set(), onToggle }) {
  const hasSelected = selected.size > 0

  return (
    <svg viewBox="-257 -257 514 514"
      style={{ width: '100%', maxWidth: 400, height: 'auto', display: 'block', margin: '0 auto' }}>

      {PETALS.map((petal, i) => {
        const startA = i * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        return (
          <g key={petal.base.id}>
            {/* Zewnętrzny — łagodna */}
            <Band d={sector(R2, RO, startA, endA)} emotion={petal.mild}
              selected={selected} hasSelected={hasSelected} onToggle={onToggle}
              labelR={(R2+RO)/2} midA={midA} labelSize={9} />
            {/* Środkowy — bazowa */}
            <Band d={sector(R1, R2, startA, endA)} emotion={petal.base}
              selected={selected} hasSelected={hasSelected} onToggle={onToggle}
              labelR={(R1+R2)/2} midA={midA} labelSize={11.5} bold />
            {/* Wewnętrzny — intensywna */}
            <Band d={sector(RI, R1, startA, endA)} emotion={petal.intense}
              selected={selected} hasSelected={hasSelected} onToggle={onToggle}
              labelR={(RI+R1)/2 + 2} midA={midA} labelSize={7.5} lightText />
          </g>
        )
      })}

      {/* Pierścień emocji mieszanych */}
      {BLENDS.map(bl => {
        const startA = (bl.k + 0.5) * STEP - Math.PI / 2
        const endA   = startA + STEP
        const midA   = startA + STEP / 2
        return (
          <Band key={bl.id} d={sector(RO, RB, startA, endA, 0.026)} emotion={bl}
            selected={selected} hasSelected={hasSelected} onToggle={onToggle}
            labelR={(RO+RB)/2} midA={midA} labelSize={7.5} />
        )
      })}

      {/* Środek — czyszczenie wyboru */}
      <circle cx={0} cy={0} r={RI - 3}
        fill="var(--bg2, #0F111A)" stroke="var(--border, rgba(255,255,255,0.07))" strokeWidth={1}
        onClick={() => hasSelected && onToggle(null)}
        style={{ cursor: hasSelected ? 'pointer' : 'default' }} />
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
        fontSize={9} fill="rgba(255,255,255,0.35)"
        fontFamily="'Space Grotesk',system-ui,sans-serif"
        letterSpacing="0.12em"
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {hasSelected ? 'WYCZYŚĆ' : 'EMOCJE'}
      </text>
    </svg>
  )
}
