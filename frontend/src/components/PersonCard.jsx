import { CARD_W, CARD_H } from '../utils/buildLayout'

const R    = 10
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// SVG group for a single person card.
// cx/cy = center of the card.
export default function PersonCard({ person, cx, cy, onSelect }) {
  if (!person) return null

  const isAlive   = person.is_alive !== false
  const born      = person.birth_date?.slice(0, 4)
  const died      = !isAlive ? person.death_date?.slice(0, 4) : null
  const yearLabel = born
    ? (died ? `${born}–${died}` : `b. ${born}`)
    : (died ? `d. ${died}` : null)

  const accent = isAlive ? '#2563eb' : '#9ca3af'
  const border = isAlive ? '#bfdbfe' : '#e5e7eb'
  const lx     = cx - CARD_W / 2
  const ty     = cy - CARD_H / 2

  return (
    <g onClick={() => onSelect(person)} style={{ cursor: 'pointer' }}>
      {/* shadow */}
      <rect x={lx + 3} y={ty + 3} width={CARD_W} height={CARD_H} rx={R} fill="rgba(0,0,0,0.08)" />
      {/* card */}
      <rect x={lx} y={ty} width={CARD_W} height={CARD_H} rx={R} fill="#fff" stroke={border} strokeWidth={2} />
      {/* left accent bar */}
      <rect x={lx}     y={ty} width={6} height={CARD_H} rx={R} fill={accent} />
      <rect x={lx + 3} y={ty} width={3} height={CARD_H}        fill={accent} />
      {/* name */}
      <text
        textAnchor="middle" x={cx}
        y={cy + (yearLabel ? -9 : 5)}
        fill="#111827" fontSize={15} fontWeight="400" fontFamily={FONT}
      >
        {person.name}
      </text>
      {/* dates */}
      {yearLabel && (
        <text textAnchor="middle" x={cx} y={cy + 12} fill="#6b7280" fontSize={11} fontFamily={FONT}>
          {yearLabel}
        </text>
      )}
    </g>
  )
}
