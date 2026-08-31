import { useEffect, useRef, useState } from 'react'

type Props = {
  windStrength: number
  showBanner: boolean
}

type Petal = {
  id: number
  x: number
  y: number
  rot: number
  vx: number
  vy: number
  size: number
  hue: string
  life: number
}

const GUST_MS = 3000

export function WindOverlay({ windStrength, showBanner }: Props) {
  const [petals, setPetals] = useState<Petal[]>([])
  const [bannerOn, setBannerOn] = useState(false)
  const petalsRef = useRef<Petal[]>([])
  const rafRef = useRef(0)
  const clearTimer = useRef(0)

  useEffect(() => {
    if (!showBanner) return

    setBannerOn(true)
    const colors = ['#e8c4a8', '#d4a0b0', '#f0e6d4', '#c9a45c', '#b8d4c8']
    // One controlled burst — not cumulative
    const burst: Petal[] = Array.from({ length: 22 }, (_, i) => ({
      id: Date.now() + i,
      x: 12 + Math.random() * 76,
      y: 32 + Math.random() * 40,
      rot: Math.random() * 360,
      vx: 0.35 + Math.random() * 0.9,
      vy: 0.15 + Math.random() * 0.55,
      size: 6 + Math.random() * 9,
      hue: colors[i % colors.length],
      life: 1,
    }))
    petalsRef.current = burst
    setPetals(burst)

    window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => {
      setBannerOn(false)
      petalsRef.current = []
      setPetals([])
    }, GUST_MS)

    return () => window.clearTimeout(clearTimer.current)
  }, [showBanner])

  useEffect(() => {
    const tick = () => {
      if (petalsRef.current.length) {
        petalsRef.current = petalsRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            rot: p.rot + 3,
            life: p.life - 0.0055, // fade across ~3s
          }))
          .filter((p) => p.life > 0 && p.y < 110 && p.x < 120)
        setPetals([...petalsRef.current])
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // If wind drops to calm, ensure petals/banner are gone
  useEffect(() => {
    if (windStrength <= 0.02 && !showBanner) {
      setBannerOn(false)
      petalsRef.current = []
      setPetals([])
    }
  }, [windStrength, showBanner])

  return (
    <div
      className="wind-overlay"
      style={{ ['--wind' as string]: windStrength }}
      aria-hidden
    >
      <div className="wind-lines" />
      {petals.map((p) => (
        <span
          key={p.id}
          className="wind-petal"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.65,
            background: p.hue,
            opacity: Math.max(0, p.life),
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
      {bannerOn && <p className="wind-banner">風來了</p>}
    </div>
  )
}
