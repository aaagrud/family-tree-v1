import { useEffect, useState, useRef } from 'react'
import api from '../api'
import PersonPanel from '../components/PersonPanel'
import PersonCard from '../components/PersonCard'
import { buildLayout, CARD_H, CARD_W, CONN_W, HALF_COUPLE } from '../utils/buildLayout'

const LINE_COLOR  = '#94a3b8'
const SEC_COLOR   = '#e879f9'  // dashed cross-branch line

export default function Tree() {
  const [layout, setLayout]               = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  const svgRef = useRef()
  const gRef   = useRef()
  const vpRef  = useRef({ x: 0, y: 0, scale: 1 })

  // ── Fetch + build layout ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/tree')
      .then(r => {
        const result = buildLayout(r.data)
        setLayout(result)
      })
      .catch(() => setError('Could not load family tree.'))
      .finally(() => setLoading(false))
  }, [])

  // ── Fit tree to viewport on first load ───────────────────────────────────
  useEffect(() => {
    if (!layout?.bounds || !svgRef.current) return
    const { bounds } = layout
    const svgW   = svgRef.current.clientWidth
    const svgH   = svgRef.current.clientHeight
    const treeW  = bounds.maxX - bounds.minX
    const treeH  = bounds.maxY - bounds.minY
    const scale  = Math.min(0.9, (svgW * 0.85) / treeW, (svgH * 0.85) / treeH)
    const x      = svgW / 2 - (bounds.minX + treeW / 2) * scale
    const y      = 60
    vpRef.current = { x, y, scale }
    gRef.current?.setAttribute('transform', `translate(${x},${y}) scale(${scale})`)
  }, [layout])

  // ── Pan / zoom (mutates SVG transform directly — no React re-renders) ─────
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let dragging = false, lastX = 0, lastY = 0

    const apply = () => {
      const { x, y, scale } = vpRef.current
      gRef.current?.setAttribute('transform', `translate(${x},${y}) scale(${scale})`)
    }

    const onWheel = e => {
      e.preventDefault()
      const rect   = svg.getBoundingClientRect()
      const cx     = e.clientX - rect.left
      const cy     = e.clientY - rect.top
      const { x, y, scale } = vpRef.current
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const ns     = Math.max(0.05, Math.min(4, scale * factor))
      vpRef.current = { x: cx - (cx - x) * (ns / scale), y: cy - (cy - y) * (ns / scale), scale: ns }
      apply()
    }

    const onPointerDown = e => {
      if (e.button !== 0) return
      dragging = true
      lastX = e.clientX; lastY = e.clientY
      svg.setPointerCapture(e.pointerId)
      svg.style.cursor = 'grabbing'
    }

    const onPointerMove = e => {
      if (!dragging) return
      vpRef.current.x += e.clientX - lastX
      vpRef.current.y += e.clientY - lastY
      lastX = e.clientX; lastY = e.clientY
      apply()
    }

    const onPointerUp = () => { dragging = false; svg.style.cursor = 'grab' }

    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading tree…</div>
  if (error)   return <div className="flex items-center justify-center h-screen text-gray-500">{error}</div>
  if (!layout?.units.length) return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      No family data yet. Add people from the admin panel.
    </div>
  )

  const { units, edges } = layout

  // Group primary edges by parent unit for comb-style rendering
  const combs = {}
  edges.filter(e => e.type === 'primary').forEach(({ fromUnit, toUnit }) => {
    if (!combs[fromUnit.id]) combs[fromUnit.id] = { fromUnit, children: [] }
    combs[fromUnit.id].children.push(toUnit)
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 text-sm text-gray-400 bg-white/70 px-3 py-1 rounded-full pointer-events-none select-none">
          Scroll to zoom · Drag to pan · Click a name to open profile
        </div>

        <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }}>
          <g ref={gRef}>

            {/* ── Primary edges: comb connectors ───────────────────────── */}
            {Object.values(combs).map(({ fromUnit, children }) => {
              const fx      = fromUnit.x
              const fy      = fromUnit.y + CARD_H / 2
              const nearestChildY = Math.min(...children.map(c => c.y)) - CARD_H / 2
              const midY    = (fy + nearestChildY) / 2
              const toY     = nearestChildY  // used only in the single-child path

              if (children.length === 1) {
                const tx = children[0].x
                return (
                  <path
                    key={`pe-${fromUnit.id}`}
                    d={`M${fx},${fy} V${midY} H${tx} V${toY}`}
                    fill="none" stroke={LINE_COLOR} strokeWidth={1.5}
                  />
                )
              }

              const cxs    = children.map(c => c.x)
              const leftX  = Math.min(...cxs)
              const rightX = Math.max(...cxs)
              return (
                <g key={`comb-${fromUnit.id}`}>
                  <line x1={fx}    y1={fy}   x2={fx}    y2={midY} stroke={LINE_COLOR} strokeWidth={1.5} />
                  <line x1={leftX} y1={midY} x2={rightX} y2={midY} stroke={LINE_COLOR} strokeWidth={1.5} />
                  {children.map(c => (
                    <line key={c.id} x1={c.x} y1={midY} x2={c.x} y2={c.y - CARD_H / 2} stroke={LINE_COLOR} strokeWidth={1.5} />
                  ))}
                </g>
              )
            })}

            {/* ── Secondary edges: dashed cross-branch lines ────────────── */}
            {edges.filter(e => e.type === 'secondary').map(({ fromUnit, toUnit, toP2 }) => {
              const fx  = fromUnit.x
              const fy  = fromUnit.y + CARD_H / 2
              const tx  = toP2 ? toUnit.x + HALF_COUPLE : toUnit.x - HALF_COUPLE
              const ty  = toUnit.y - CARD_H / 2
              return (
                <line
                  key={`se-${fromUnit.id}-${toUnit.id}`}
                  x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={SEC_COLOR} strokeWidth={1.5} strokeDasharray="6 4"
                />
              )
            })}

            {/* ── Couple connectors (double horizontal bar) ─────────────── */}
            {units.filter(u => u.p2).map(u => {
              const x1 = u.x - HALF_COUPLE + CARD_W / 2   // right edge of p1 card
              const x2 = u.x + HALF_COUPLE - CARD_W / 2   // left edge of p2 card
              return (
                <g key={`conn-${u.id}`}>
                  <line x1={x1} y1={u.y - 3} x2={x2} y2={u.y - 3} stroke={LINE_COLOR} strokeWidth={1.5} />
                  <line x1={x1} y1={u.y + 3} x2={x2} y2={u.y + 3} stroke={LINE_COLOR} strokeWidth={1.5} />
                </g>
              )
            })}

            {/* ── Person cards ──────────────────────────────────────────── */}
            {units.map(u => (
              <g key={u.id}>
                <PersonCard
                  person={u.p1}
                  cx={u.p2 ? u.x - HALF_COUPLE : u.x}
                  cy={u.y}
                  onSelect={setSelectedPerson}
                />
                {u.p2 && (
                  <PersonCard
                    person={u.p2}
                    cx={u.x + HALF_COUPLE}
                    cy={u.y}
                    onSelect={setSelectedPerson}
                  />
                )}
              </g>
            ))}

          </g>
        </svg>
      </div>

      {selectedPerson && (
        <PersonPanel
          personId={selectedPerson.id}
          onClose={() => setSelectedPerson(null)}
          onNavigate={id => setSelectedPerson({ id })}
        />
      )}
    </div>
  )
}
