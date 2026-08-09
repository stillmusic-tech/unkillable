// The shared globe — a lightweight hand-drawn canvas globe used by the
// observatory (homepage) and Attack 2 (shut down the server). No WebGL, no
// three.js: an orthographic projection of real node coordinates onto a 2D
// canvas, drag-to-spin, with orange glowing nodes and pulsing transaction
// arcs. Deliberately reusable and killable node-by-node for Attack 2.

import coastlines from '../data/coastlines.json'

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
  reviveAll(): void
  aliveCount(): number
  destroy(): void
}

export function createGlobe(
  canvas: HTMLCanvasElement,
  initialNodes: GlobeNode[],
  options: GlobeOptions = {},
): GlobeHandle {
  const {
    autoRotateDegPerSec = 6,
    showTransactions = true,
    radiusFraction = 0.42,
  } = options

  const ctx = canvas.getContext('2d')!
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

    ctx.clearRect(0, 0, w, h)

    // Globe disc — faint filled sphere with a soft edge glow.
    const grad = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.2, cx, cy, R)
    grad.addColorStop(0, 'rgba(20,40,70,0.55)')
    grad.addColorStop(1, 'rgba(8,16,30,0.15)')
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = 'rgba(70,120,190,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Coastlines — front-facing arcs only.
    ctx.lineWidth = 1
    for (const stroke of Object.values(coastlines.strokes) as [number, number][][]) {
      ctx.beginPath()
      let penDown = false
      for (const [lon, lat] of stroke) {
        const p = project(latLonToVec3(lat, lon))
        const sx = cx + p.x * R
        const sy = cy - p.y * R
        if (p.z >= 0) {
          if (penDown) ctx.lineTo(sx, sy)
          else {
            ctx.moveTo(sx, sy)
            penDown = true
          }
        } else {
          penDown = false
        }
      }
      ctx.strokeStyle = 'rgba(80,140,210,0.45)'
      ctx.stroke()
    }

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
        const mx = (s.x + e.x) / 2
        const my = (s.y + e.y) / 2 - 30 // arc lift
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.quadraticCurveTo(mx, my, e.x, e.y)
        ctx.strokeStyle = `rgba(247,147,26,${0.5 * (1 - Math.abs(0.5 - prog) * 2)})`
        ctx.lineWidth = 1.2
        ctx.stroke()
        // travelling spark
        const t2 = prog
        const bx = (1 - t2) * (1 - t2) * s.x + 2 * (1 - t2) * t2 * mx + t2 * t2 * e.x
        const by = (1 - t2) * (1 - t2) * s.y + 2 * (1 - t2) * t2 * my + t2 * t2 * e.y
        ctx.beginPath()
        ctx.arc(bx, by, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,200,120,0.95)'
        ctx.fill()
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

    requestAnimationFrame(draw)
  }

  // --- Interaction: drag to spin -------------------------------------------
  function onDown(clientX: number, clientY: number) {
    dragging = true
    lastX = clientX
    lastY = clientY
    velocity = 0
  }
  function onMove(clientX: number, clientY: number) {
    if (!dragging) return
    const dx = clientX - lastX
    const dy = clientY - lastY
    rotationY += dx * 0.005
    tiltX = Math.max(-1.2, Math.min(1.2, tiltX + dy * 0.005))
    velocity = dx * 0.05
    lastX = clientX
    lastY = clientY
  }
  function onUp() {
    dragging = false
  }

  const mdown = (e: MouseEvent) => onDown(e.clientX, e.clientY)
  const mmove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
  const mup = () => onUp()
  const tstart = (e: TouchEvent) => {
    if (e.touches[0]) onDown(e.touches[0].clientX, e.touches[0].clientY)
  }
  const tmove = (e: TouchEvent) => {
    if (e.touches[0]) {
      onMove(e.touches[0].clientX, e.touches[0].clientY)
      e.preventDefault()
    }
  }
  const tend = () => onUp()
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
    reviveAll() {
      for (const n of nodes) n.alive = true
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
