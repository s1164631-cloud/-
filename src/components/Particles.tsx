import { useEffect, useRef } from 'react'

type Props = {
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night'
}

/** Soft floating particles — fireflies / pollen / dust. */
export function Particles({ timeOfDay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0

    const resize = () => {
      w = canvas.width = window.innerWidth * devicePixelRatio
      h = canvas.height = window.innerHeight * devicePixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const count = timeOfDay === 'night' || timeOfDay === 'dusk' ? 48 : 28
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (1.2 + Math.random() * 2.4) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      vy: (-0.15 - Math.random() * 0.35) * devicePixelRatio,
      a: 0.2 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    }))

    const color =
      timeOfDay === 'night'
        ? '210, 230, 180'
        : timeOfDay === 'dusk'
          ? '255, 210, 140'
          : timeOfDay === 'dawn'
            ? '255, 200, 190'
            : '255, 245, 220'

    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx + Math.sin(t * 0.001 + p.phase) * 0.2
        p.y += p.vy
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0

        const pulse = 0.55 + 0.45 * Math.sin(t * 0.003 + p.phase)
        ctx.beginPath()
        ctx.fillStyle = `rgba(${color}, ${p.a * pulse})`
        ctx.shadowColor = `rgba(${color}, ${0.6 * pulse})`
        ctx.shadowBlur = 12 * devicePixelRatio
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [timeOfDay])

  return <canvas ref={canvasRef} className="particles" aria-hidden />
}
