import { useEffect, useRef, useState } from 'react'
import { BlowDetector } from '../lib/blowDetect'

const GUST_MS = 3000

export function useBlowDetection(enabled: boolean, sensitivity = 1.5) {
  const detectorRef = useRef<BlowDetector | null>(null)
  const [windStrength, setWindStrength] = useState(0)
  const [blowing, setBlowing] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [triggered, setTriggered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const gustTimer = useRef(0)

  useEffect(() => {
    if (!enabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setReady(false)
      setWindStrength(0)
      setBlowing(false)
      setMicLevel(0)
      setTriggered(false)
      setError(null)
      return
    }

    let cancelled = false
    let raf = 0
    const detector = new BlowDetector({
      sensitivity,
      gustHoldMs: GUST_MS,
      cooldownMs: 3500,
    })
    detectorRef.current = detector

    const startGustUi = () => {
      setTriggered(true)
      window.clearTimeout(gustTimer.current)
      gustTimer.current = window.setTimeout(() => {
        setTriggered(false)
        setWindStrength(0)
        detector.clearGust()
      }, GUST_MS)
    }

    const boot = async () => {
      try {
        await detector.start()
        if (cancelled) {
          detector.stop()
          return
        }
        setReady(true)
        setError(null)

        const loop = () => {
          const { sample, triggered: edge, windStrength: w } = detector.tick()
          setBlowing(sample.blowing)
          setMicLevel(sample.level)
          setWindStrength(w)
          if (edge) startGustUi()
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      } catch (err) {
        setReady(false)
        setError(
          err instanceof Error
            ? err.message
            : '請連接麥克風以啟用吹氣功能',
        )
      }
    }

    void boot()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(gustTimer.current)
      detector.stop()
      detectorRef.current = null
    }
  }, [enabled, sensitivity])

  const triggerDemoWind = () => {
    const detector = detectorRef.current
    detector?.forceGust(0.85)
    setWindStrength(0.85)
    setTriggered(true)
    window.clearTimeout(gustTimer.current)
    gustTimer.current = window.setTimeout(() => {
      setTriggered(false)
      setWindStrength(0)
      detector?.clearGust()
    }, GUST_MS)
  }

  return {
    windStrength,
    blowing,
    micLevel,
    triggered,
    error,
    ready,
    triggerDemoWind,
  }
}
