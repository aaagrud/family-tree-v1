// Pedigree layout: converts a flat people list into x/y-positioned couple units + edges.
//
// A "couple unit" is either {p1, p2} (married pair) or {p1} (solo).
// Children hang from the unit's midpoint. Cross-branch couples (both spouses have
// parents in different units) stay in one branch; the other branch connects via a
// dashed secondary edge to the spouse's card.

export const CARD_W     = 190
export const CARD_H     = 72
export const CONN_W     = 28                          // gap between couple cards
export const HALF_COUPLE = CONN_W / 2 + CARD_W / 2  // 109: center → card center offset

const UNIT_STEP = CARD_W * 2 + CONN_W + 60  // 468: horizontal slot width
const ROW_H     = CARD_H + 120              // 192: vertical step between generations

export function buildLayout(people) {
  if (!people?.length) return { units: [], edges: [], bounds: null }

  const byId = {}
  people.forEach(p => { byId[p.id] = p })

  // ── 1. Build couple units ─────────────────────────────────────────────────
  const units      = {}  // unitId → unit
  const personUnit = {}  // personId → unitId
  const seenPairs  = new Set()

  function mkUnit(p1, p2) {
    const uid = p2
      ? `u${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`
      : `u${p1.id}`
    units[uid] = { id: uid, p1, p2: p2 || null, childUnits: [], parentUnits: [], generation: null, x: 0, y: 0 }
    personUnit[p1.id] = uid
    if (p2) personUnit[p2.id] = uid
  }

  // Couple units first (spouse pairs)
  people.forEach(p => {
    if (personUnit[p.id]) return
    const sRaw   = p.spouses?.[0]
    const spouse = sRaw && byId[sRaw.id]
    if (spouse && !personUnit[spouse.id]) {
      const key = `${Math.min(p.id, spouse.id)}-${Math.max(p.id, spouse.id)}`
      if (!seenPairs.has(key)) {
        seenPairs.add(key)
        const [a, b] = p.id < spouse.id ? [p, spouse] : [spouse, p]
        mkUnit(a, b)
      }
    }
  })
  // Solo units for anyone not yet paired
  people.forEach(p => { if (!personUnit[p.id]) mkUnit(p, null) })

  // ── 2. Wire parent → child relationships between units ────────────────────
  people.forEach(p => {
    const childUnit = units[personUnit[p.id]]
    const pids = p.parent_ids?.length ? p.parent_ids : (p.parent_id ? [p.parent_id] : [])
    const parentUids = [...new Set(pids.map(pid => personUnit[pid]).filter(Boolean))]
    parentUids.forEach(puid => {
      const pu = units[puid]
      if (!pu.childUnits.includes(childUnit)) pu.childUnits.push(childUnit)
      if (!childUnit.parentUnits.includes(pu))  childUnit.parentUnits.push(pu)
    })
  })

  // ── 3. Cross-branch detection ─────────────────────────────────────────────
  // When a couple unit has parents in two different units, keep p1's branch as
  // primary (it stays in the layout tree). p2's branch becomes a secondary edge
  // (dashed line). Remove the unit from the secondary parent's childUnits so it
  // isn't laid out twice.
  const secondaryEdges = []

  Object.values(units).forEach(unit => {
    if (unit.parentUnits.length < 2) return

    const p1pids = unit.p1.parent_ids?.length
      ? unit.p1.parent_ids
      : (unit.p1.parent_id ? [unit.p1.parent_id] : [])
    const p1UnitIds = new Set(p1pids.map(pid => personUnit[pid]).filter(Boolean))

    unit.parentUnits.forEach(pu => {
      if (!p1UnitIds.has(pu.id)) {
        pu.childUnits = pu.childUnits.filter(cu => cu !== unit)
        secondaryEdges.push({ type: 'secondary', fromUnit: pu, toUnit: unit, toP2: true })
      }
    })
  })

  // ── 4. Find layout roots ──────────────────────────────────────────────────
  const isChild = new Set()
  Object.values(units).forEach(u => u.childUnits.forEach(c => isChild.add(c.id)))
  const roots = Object.values(units).filter(u => !isChild.has(u.id))

  // ── 5. Assign generations (BFS from roots) ────────────────────────────────
  const bfsQ    = roots.map(r => ({ u: r, g: 0 }))
  const bfsSeen = new Set()
  while (bfsQ.length) {
    const { u, g } = bfsQ.shift()
    if (bfsSeen.has(u.id)) continue
    bfsSeen.add(u.id)
    u.generation = g
    u.childUnits.forEach(c => bfsQ.push({ u: c, g: g + 1 }))
  }
  // Fallback for any unit not reached (isolated via secondary edge removal)
  Object.values(units).forEach(u => { if (u.generation === null) u.generation = 0 })

  // ── 6. Assign x positions (post-order; leaves are numbered sequentially) ──
  // Parent x = midpoint of leftmost and rightmost child x.
  // Sequential leaf numbering guarantees no overlaps.
  let leafX  = 0
  const xSeen = new Set()

  function assignX(u) {
    if (xSeen.has(u.id)) return
    xSeen.add(u.id)
    if (u.childUnits.length === 0) {
      u.x = leafX
      leafX += UNIT_STEP
    } else {
      u.childUnits.forEach(assignX)
      const xs = u.childUnits.map(c => c.x)
      u.x = (Math.min(...xs) + Math.max(...xs)) / 2
    }
  }
  roots.forEach(assignX)

  // ── 7. Y positions ────────────────────────────────────────────────────────
  Object.values(units).forEach(u => { u.y = u.generation * ROW_H })

  // ── 8. Compute bounding box ───────────────────────────────────────────────
  const allUnits = Object.values(units)
  const xs = allUnits.map(u => u.x)
  const ys = allUnits.map(u => u.y)
  const bounds = {
    minX: Math.min(...xs) - UNIT_STEP / 2,
    maxX: Math.max(...xs) + UNIT_STEP / 2,
    minY: 0,
    maxY: Math.max(...ys) + CARD_H * 2,
  }

  // ── 9. Primary edges ──────────────────────────────────────────────────────
  const primaryEdges = []
  Object.values(units).forEach(u =>
    u.childUnits.forEach(c =>
      primaryEdges.push({ type: 'primary', fromUnit: u, toUnit: c })
    )
  )

  return { units: allUnits, edges: [...primaryEdges, ...secondaryEdges], bounds }
}
