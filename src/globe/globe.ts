// The shared globe — a lightweight hand-drawn canvas globe used by the
// observatory (homepage) and Attack 2 (shut down the server). No WebGL, no
// three.js: an orthographic projection of real node coordinates onto a 2D
// canvas, drag-to-spin, with orange glowing nodes and pulsing transaction
// arcs. Deliberately NOT a library globe (COBE/three.js) — Attack 2 needs
// per-node kill, tap-to-aim, dark earth and regrowth, which none of them do.
// Continents render as a dot matrix: landdots.json is a Fibonacci sphere
// lattice pre-filtered to real land polygons (see its note for provenance).

import landdots from '../data/landdots.json'

export interface GlobeNode {
  lat: number
  lon: number
  /** false = darkened/killed (Attack 2). Defaults true. */
  alive?: boolean
}

export interface GlobeOptions {
  /** Autorotate speed in degrees/second when not being dragged. 0 disables. */
  autoRotateDegPerSec?: number
  /** Show pulsing transaction arcs between random alive nodes. */
  showTransactions?: boolean
  /** Radius as a fraction of the smaller canvas dimension (0–0.5). */
  radiusFraction?: number
  /** Fired on a tap (a click that wasn't a drag) with the nearest front-facing
   * node, or null if the tap missed the globe. Used by Attack 2 to aim. */
  onTap?: (hit: { index: number; lat: number; lon: number } | null) => void
}

interface Vec3 {
  x: number
  y: number
  z: number
}

const DEG = Math.PI / 180

function latLonToVec3(lat: number, lon: number): Vec3 {
  const phi = lat * DEG
  const lambda = lon * DEG
  return {
    x: Math.cos(phi) * Math.sin(lambda),
    y: Math.sin(phi),
    z: Math.cos(phi) * Math.cos(lambda),
  }
}

interface Arc {
  from: number // node index
  to: number
  start: number // ms timestamp when it began
  duration: number
}

export interface GlobeHandle {
  setNodes(nodes: GlobeNode[]): void
  /** Kill every node whose coordinates fall inside the predicate (Attack 2). */
  killWhere(pred: (n: GlobeNode) => boolean): number
  /** Kill specific nodes by index; returns how many newly died. */
  killIndices(indices: number[]): number
  /** Read-only view of the current nodes (for the page to run kill maths). */
  getNodes(): GlobeNode[]
  /** Kill everything, then reveal the lone satellite survivor in orbit. */
  darkEarth(): void
  /** Relight every node over `durationMs`, then call onDone — the regrowth turn. */
  regrow(durationMs: number, onDone?: () => void): void
  reviveAll(): void
  aliveCount(): number
  destroy(): void
}

export function createGlobe(
  canvas: HTMLCanvasElement,
  initialNodes: GlobeNode[],
  options: GlobeOptions = {},
): GlobeHandle {
  const { autoRotateDegPerSec = 6, showTransactions = true, radiusFraction = 0.42 } = options

  const ctx = canvas.getContext('2d')!
  const landVecs: Vec3[] = (landdots.dots as [number, number][]).map(([lat, lon]) =>
    latLonToVec3(lat, lon),
  )
  let nodes: GlobeNode[] = initialNodes.map((n) => ({ alive: true, ...n }))
  let rotationY = 0 // longitude spin, radians
  let tiltX = -0.35 // fixed slight tilt so the northern hemisphere leans in
  let dragging = false
  let lastX = 0
  let lastY = 0
  let velocity = 0 // drag inertia on Y
  let lastFrame = 0
  let arcs: Arc[] = []
  let arcSeed = 1
  let destroyed = false

  // Attack-2 state: the lone satellite survivor and the regrowth animation.
  let satelliteVisible = false
  let regrowing = false
  let regrowStart: number | null = null
  let regrowDuration = 2200
  let regrowOrder: number[] = []
  let regrowDone: (() => void) | null = null

  // Geometry cache from the last drawn frame, so tap-picking uses exactly what
  // the visitor sees (same rotation, same projection).
  let lastGeom = { cx: 0, cy: 0, R: 1 }

  // Deterministic PRNG so we don't call Math.random (kept side-effect-free and
  // repeatable); seeded per-arc.
  function rand(): number {
    arcSeed = (arcSeed * 1103515245 + 12345) & 0x7fffffff
    return arcSeed / 0x7fffffff
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function project(v: Vec3) {
    // Rotate around Y (spin), then tilt around X.
    const cosY = Math.cos(rotationY)
    const sinY = Math.sin(rotationY)
    const x1 = v.x * cosY - v.z * sinY
    const z1 = v.x * sinY + v.z * cosY
    const cosX = Math.cos(tiltX)
    const sinX = Math.sin(tiltX)
    const y2 = v.y * cosX - z1 * sinX
    const z2 = v.y * sinX + z1 * cosX
    return { x: x1, y: y2, z: z2 }
  }

  function draw(now: number) {
    if (destroyed) return
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0
    lastFrame = now

    if (!dragging) {
      rotationY += (autoRotateDegPerSec * DEG + velocity) * dt
      velocity *= 0.94 // inertia decay
    }

    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * radiusFraction
    lastGeom = { cx, cy, R }

    // Regrowth progression: relight nodes in order over the duration.
    if (regrowing) {
      if (regrowStart === null) regrowStart = now
      const frac = Math.min(1, (now - regrowStart) / regrowDuration)
      const lit = Math.floor(frac * regrowOrder.length)
      for (let k = 0; k < lit; k++) nodes[regrowOrder[k]].alive = true
      if (frac >= 1) {
        regrowing = false
        regrowStart = null
        satelliteVisible = false
        const cb = regrowDone
        regrowDone = null
        if (cb) cb()
      }
    }

    ctx.clearRect(0, 0, w, h)

    // Warm bloom behind the sphere, brightest at the rim, so the globe reads
    // as emitting light into the void rather than floating on flat black.
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35)
    bloom.addColorStop(0, 'rgba(247,147,26,0.05)')
    bloom.addColorStop(0.72, 'rgba(247,147,26,0.07)')
    bloom.addColorStop(1, 'rgba(247,147,26,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2)
    ctx.fillStyle = bloom
    ctx.fill()

    // Globe disc — a dark neutral sphere, lit slightly from the upper left.
    const grad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.35, R * 0.15, cx, cy, R)
    grad.addColorStop(0, 'rgba(24,30,42,0.9)')
    grad.addColorStop(1, 'rgba(7,10,16,0.85)')
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // Dot-matrix continents — front-facing lattice dots, charcoal-slate,
    // fading toward the limb. Rotation matrix hoisted out of the loop.
    const cosYf = Math.cos(rotationY)
    const sinYf = Math.sin(rotationY)
    const cosXf = Math.cos(tiltX)
    const sinXf = Math.sin(tiltX)
    ctx.fillStyle = 'rgba(132,146,166,0.65)'
    for (const v of landVecs) {
      const x1 = v.x * cosYf - v.z * sinYf
      const z1 = v.x * sinYf + v.z * cosYf
      const z2 = v.y * sinXf + z1 * cosXf
      if (z2 < 0.02) continue
      const y2 = v.y * cosXf - z1 * sinXf
      const alpha = 0.18 + 0.45 * z2
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(cx + x1 * R, cy - y2 * R, 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Fresnel-ish rim: darken toward the edge so the sphere blends into the
    // background instead of ending in a hard blue line.
    const rim = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R)
    rim.addColorStop(0, 'rgba(4,6,10,0)')
    rim.addColorStop(1, 'rgba(4,6,10,0.75)')
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = rim
    ctx.fill()

    // A hair of warm atmosphere right at the limb.
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(247,147,26,0.22)'
    ctx.lineWidth = 1
    ctx.shadowColor = 'rgba(247,147,26,0.5)'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // Precompute node screen positions (front hemisphere only).
    const screen: ({ x: number; y: number; z: number } | null)[] = nodes.map((n) => {
      const p = project(latLonToVec3(n.lat, n.lon))
      if (p.z < 0) return null
      return { x: cx + p.x * R, y: cy - p.y * R, z: p.z }
    })

    // Transaction arcs between alive nodes.
    if (showTransactions) {
      const t = now
      arcs = arcs.filter((a) => t - a.start < a.duration)
      if (arcs.length < 6 && rand() < 0.15) {
        const aliveIdx = nodes.map((n, i) => (n.alive ? i : -1)).filter((i) => i >= 0)
        if (aliveIdx.length > 1) {
          const from = aliveIdx[Math.floor(rand() * aliveIdx.length)]
          const to = aliveIdx[Math.floor(rand() * aliveIdx.length)]
          if (from !== to) arcs.push({ from, to, start: t, duration: 1400 })
        }
      }
      for (const a of arcs) {
        const s = screen[a.from]
        const e = screen[a.to]
        if (!s || !e) continue
        const prog = (t - a.start) / a.duration
        // Lift the curve off the surface in proportion to the hop's length so
        // long arcs arch high and short ones stay low, like flight paths.
        const chord = Math.hypot(e.x - s.x, e.y - s.y)
        const lift = Math.min(60, Math.max(16, chord * 0.3))
        const mx = (s.x + e.x) / 2
        const my = (s.y + e.y) / 2 - lift
        const fade = 1 - Math.abs(0.5 - prog) * 2
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.quadraticCurveTo(mx, my, e.x, e.y)
        ctx.strokeStyle = `rgba(247,147,26,${0.55 * fade})`
        ctx.lineWidth = 1.2
        ctx.shadowColor = 'rgba(247,147,26,0.6)'
        ctx.shadowBlur = 6
        ctx.stroke()
        // travelling energy pulse along the curve
        const t2 = prog
        const bx = (1 - t2) * (1 - t2) * s.x + 2 * (1 - t2) * t2 * mx + t2 * t2 * e.x
        const by = (1 - t2) * (1 - t2) * s.y + 2 * (1 - t2) * t2 * my + t2 * t2 * e.y
        ctx.beginPath()
        ctx.arc(bx, by, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,210,140,0.95)'
        ctx.shadowColor = 'rgba(255,180,80,0.9)'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Nodes — glowing orange dots, dimmer toward the limb.
    for (let i = 0; i < nodes.length; i++) {
      const s = screen[i]
      if (!s) continue
      const n = nodes[i]
      const depth = 0.35 + 0.65 * s.z
      if (n.alive) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(247,147,26,${0.85 * depth})`
        ctx.shadowColor = 'rgba(247,147,26,0.9)'
        ctx.shadowBlur = 6 * depth
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.beginPath()
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(90,90,100,${0.5 * depth})`
        ctx.fill()
      }
    }

    // The satellite survivor — one light that refuses to go out, orbiting
    // outside the dark globe. It carries a copy that rebuilds everything.
    if (satelliteVisible) {
      const orbit = R * 1.28
      const angle = now / 1400
      const sx = cx + Math.cos(angle) * orbit
      const sy = cy + Math.sin(angle) * orbit * 0.55
      // faint orbit ring
      ctx.beginPath()
      ctx.ellipse(cx, cy, orbit, orbit * 0.55, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(120,150,200,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(sx, sy, 3.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,210,140,0.98)'
      ctx.shadowColor = 'rgba(255,180,80,1)'
      ctx.shadowBlur = 14
      ctx.fill()
      ctx.shadowBlur = 0
    }

    requestAnimationFrame(draw)
  }

  // Nearest front-facing node to a client point, using the last frame's
  // geometry. Returns the index and coords, or null if the tap missed.
  function pickAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const { cx, cy, R } = lastGeom
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < nodes.length; i++) {
      const p = project(latLonToVec3(nodes[i].lat, nodes[i].lon))
      if (p.z < 0) continue
      const sx = cx + p.x * R
      const sy = cy - p.y * R
      const d = (sx - px) ** 2 + (sy - py) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    // Within ~28px of a node, or anywhere on the disc, counts as a hit.
    const onDisc = (px - cx) ** 2 + (py - cy) ** 2 <= R * R
    if (best >= 0 && (bestD <= 28 * 28 || onDisc)) {
      return { index: best, lat: nodes[best].lat, lon: nodes[best].lon }
    }
    return null
  }

  // --- Interaction: drag to spin, tap to aim -------------------------------
  let downX = 0
  let downY = 0
  let moved = false
  function onDown(clientX: number, clientY: number) {
    dragging = true
    lastX = clientX
    lastY = clientY
    downX = clientX
    downY = clientY
    moved = false
    velocity = 0
  }
  function onMove(clientX: number, clientY: number) {
    if (!dragging) return
    const dx = clientX - lastX
    const dy = clientY - lastY
    // Negative: dragging right pulls the visible face of the globe rightwards.
    rotationY -= dx * 0.005
    tiltX = Math.max(-1.2, Math.min(1.2, tiltX + dy * 0.005))
    velocity = -dx * 0.05
    lastX = clientX
    lastY = clientY
    if (Math.abs(clientX - downX) > 4 || Math.abs(clientY - downY) > 4) moved = true
  }
  function onUp(clientX?: number, clientY?: number) {
    dragging = false
    // A press that didn't drift is a tap — aim the weapon.
    if (!moved && options.onTap && clientX !== undefined && clientY !== undefined) {
      options.onTap(pickAt(clientX, clientY))
    }
  }

  const mdown = (e: MouseEvent) => onDown(e.clientX, e.clientY)
  const mmove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
  const mup = (e: MouseEvent) => onUp(e.clientX, e.clientY)
  const tstart = (e: TouchEvent) => {
    if (e.touches[0]) onDown(e.touches[0].clientX, e.touches[0].clientY)
  }
  const tmove = (e: TouchEvent) => {
    if (e.touches[0]) {
      onMove(e.touches[0].clientX, e.touches[0].clientY)
      e.preventDefault()
    }
  }
  const tend = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    onUp(t?.clientX, t?.clientY)
  }
  const onResize = () => resize()

  canvas.addEventListener('mousedown', mdown)
  window.addEventListener('mousemove', mmove)
  window.addEventListener('mouseup', mup)
  canvas.addEventListener('touchstart', tstart, { passive: true })
  canvas.addEventListener('touchmove', tmove, { passive: false })
  canvas.addEventListener('touchend', tend)
  window.addEventListener('resize', onResize)

  resize()
  requestAnimationFrame(draw)

  return {
    setNodes(next) {
      nodes = next.map((n) => ({ alive: true, ...n }))
      arcs = []
    },
    killWhere(pred) {
      let killed = 0
      for (const n of nodes) {
        if (n.alive && pred(n)) {
          n.alive = false
          killed++
        }
      }
      arcs = arcs.filter((a) => nodes[a.from]?.alive && nodes[a.to]?.alive)
      return killed
    },
    killIndices(indices) {
      let killed = 0
      for (const i of indices) {
        if (nodes[i]?.alive) {
          nodes[i].alive = false
          killed++
        }
      }
      arcs = arcs.filter((a) => nodes[a.from]?.alive && nodes[a.to]?.alive)
      return killed
    },
    getNodes() {
      return nodes.map((n) => ({ ...n }))
    },
    darkEarth() {
      for (const n of nodes) n.alive = false
      arcs = []
      satelliteVisible = true
      regrowing = false
      regrowStart = null
    },
    regrow(durationMs, onDone) {
      regrowDuration = durationMs
      // Relight in a fixed shuffled order so it reads as spreading, not sweeping.
      regrowOrder = nodes.map((_, i) => i)
      for (let i = regrowOrder.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[regrowOrder[i], regrowOrder[j]] = [regrowOrder[j], regrowOrder[i]]
      }
      for (const n of nodes) n.alive = false
      regrowing = true
      regrowStart = null
      regrowDone = onDone ?? null
    },
    reviveAll() {
      for (const n of nodes) n.alive = true
      satelliteVisible = false
      regrowing = false
    },
    aliveCount() {
      return nodes.filter((n) => n.alive).length
    },
    destroy() {
      destroyed = true
      canvas.removeEventListener('mousedown', mdown)
      window.removeEventListener('mousemove', mmove)
      window.removeEventListener('mouseup', mup)
      canvas.removeEventListener('touchstart', tstart)
      canvas.removeEventListener('touchmove', tmove)
      canvas.removeEventListener('touchend', tend)
      window.removeEventListener('resize', onResize)
    },
  }
}
