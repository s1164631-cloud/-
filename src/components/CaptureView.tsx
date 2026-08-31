import { useEffect, useRef, useState } from 'react'
import { PLANT_LIBRARY } from '../data/plants'
import { applyMonetPreviewFilter } from '../lib/monetFilter'

type Props = {
  onCapture: (rawDataUrl: string) => void
  onCancel: () => void
  onPickPlant: (plantId: string, rawDataUrl: string) => void
}

export function CaptureView({ onCapture, onCancel, onPickPlant }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    let cancelled = false
    let raf = 0

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCameraReady(true)

        const tick = () => {
          const canvas = canvasRef.current
          if (canvas && video.readyState >= 2) {
            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth || 640
              canvas.height = video.videoHeight || 480
            }
            applyMonetPreviewFilter(video, canvas)
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        setCameraError('無法開啟鏡頭，請改用上傳圖片或手動選花。')
      }
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const snap = () => {
    const video = videoRef.current
    if (!video || !cameraReady) return
    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    c.getContext('2d')!.drawImage(video, 0, 0)
    onCapture(c.toDataURL('image/jpeg', 0.92))
  }

  const onFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onCapture(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const paintPlaceholder = (plantId: string) => {
    const plant = PLANT_LIBRARY.find((p) => p.id === plantId)
    if (!plant) return
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(220, 200, 40, 256, 256, 280)
    g.addColorStop(0, plant.palette[1])
    g.addColorStop(0.45, plant.palette[0])
    g.addColorStop(1, plant.palette[2])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 512)

    // Soft petal blobs
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const x = 256 + Math.cos(a) * 90
      const y = 256 + Math.sin(a) * 90
      ctx.beginPath()
      ctx.fillStyle = plant.palette[i % 2 === 0 ? 1 : 0]
      ctx.globalAlpha = 0.55
      ctx.ellipse(x, y, 70, 40, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.fillStyle = '#e8c85a'
    ctx.arc(256, 256, 36, 0, Math.PI * 2)
    ctx.fill()

    onPickPlant(plantId, c.toDataURL('image/png'))
  }

  return (
    <div className="capture-view">
      <header className="capture-header">
        <button className="ghost-btn" onClick={onCancel}>
          ← 返回花園
        </button>
        <p className="capture-hint">將植物對準框框，輕觸拍攝</p>
      </header>

      <div className="capture-stage">
        <video ref={videoRef} playsInline muted className="capture-video" />
        <canvas ref={canvasRef} className="capture-canvas" />
        <div className="capture-frame" />
        {cameraError && <p className="capture-error">{cameraError}</p>}
      </div>

      <div className="capture-actions">
        <label className="ghost-btn file-btn">
          上傳圖片
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className="shutter"
          onClick={snap}
          disabled={!cameraReady}
          aria-label="拍攝"
        >
          <span />
        </button>

        <button className="ghost-btn" onClick={() => setShowManual((v) => !v)}>
          手動選花
        </button>
      </div>

      {showManual && (
        <div className="manual-picker">
          <p>示範模式：直接選一種花種入花園</p>
          <div className="manual-grid">
            {PLANT_LIBRARY.map((p) => (
              <button
                key={p.id}
                type="button"
                style={{
                  background: `linear-gradient(145deg, ${p.palette[1]}, ${p.palette[0]})`,
                }}
                onClick={() => paintPlaceholder(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
