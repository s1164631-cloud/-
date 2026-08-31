/** Lightweight Monet-style oil-paint approximation for canvas demos. */

function clamp(v: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v))
}

function hashNoise(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

export type MonetParams = {
  brushSize?: number
  paintIntensity?: number
  softness?: number
  bloomStrength?: number
}

/**
 * Apply a Monet-inspired oil paint look: soft color blocks, warm/cool shift,
 * canvas grain, and gentle bloom. Runs on a downscaled working buffer for speed.
 */
export async function applyMonetFilter(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  params: MonetParams = {},
): Promise<string> {
  const brushSize = params.brushSize ?? 8
  const paintIntensity = params.paintIntensity ?? 0.75
  const softness = params.softness ?? 0.6
  const bloomStrength = params.bloomStrength ?? 0.3

  const maxSide = 640
  const sw =
    'videoWidth' in source
      ? source.videoWidth || (source as HTMLVideoElement).clientWidth || 640
      : (source as HTMLImageElement | HTMLCanvasElement).width
  const sh =
    'videoHeight' in source
      ? source.videoHeight || (source as HTMLVideoElement).clientHeight || 480
      : (source as HTMLImageElement | HTMLCanvasElement).height

  const scale = Math.min(1, maxSide / Math.max(sw, sh, 1))
  const w = Math.max(1, Math.floor(sw * scale))
  const h = Math.max(1, Math.floor(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)

  ctx.filter = `blur(${softness * 1.8}px)`
  ctx.drawImage(canvas, 0, 0)
  ctx.filter = 'none'

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const out = new Uint8ClampedArray(data)
  const step = Math.max(2, Math.floor(brushSize / 2))

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      const radius = Math.floor(brushSize / 2)

      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          const px = Math.max(0, Math.min(w - 1, x + dx))
          const py = Math.max(0, Math.min(h - 1, y + dy))
          const i = (py * w + px) * 4
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
      }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)

      const lum = (r + g + b) / 3
      const cool = Math.max(0, (120 - lum) / 120)
      const warm = Math.max(0, (lum - 140) / 115)

      r = clamp(r + 12 * warm - 6 * cool + 8)
      g = clamp(g - 4 * cool + 2 * warm)
      b = clamp(b + 18 * cool - 4 * warm + 10)

      const noise = (hashNoise(x, y) - 0.5) * 18 * paintIntensity

      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const px = x + dx
          const py = y + dy
          if (px >= w || py >= h) continue
          const i = (py * w + px) * 4
          const mix = paintIntensity
          out[i] = clamp(data[i] * (1 - mix) + (r + noise) * mix)
          out[i + 1] = clamp(
            data[i + 1] * (1 - mix) + (g + noise * 0.7) * mix,
          )
          out[i + 2] = clamp(
            data[i + 2] * (1 - mix) + (b + noise * 0.5) * mix,
          )
          out[i + 3] = data[i + 3]
        }
      }
    }
  }

  if (bloomStrength > 0) {
    for (let i = 0; i < out.length; i += 4) {
      const lum = (out[i] + out[i + 1] + out[i + 2]) / 3
      if (lum > 160) {
        const t = ((lum - 160) / 95) * bloomStrength
        out[i] = clamp(out[i] + 40 * t)
        out[i + 1] = clamp(out[i + 1] + 28 * t)
        out[i + 2] = clamp(out[i + 2] + 12 * t)
      }
    }
  }

  imageData.data.set(out)
  ctx.putImageData(imageData, 0, 0)

  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 1200; i++) {
    const gx = Math.random() * w
    const gy = Math.random() * h
    ctx.fillStyle = Math.random() > 0.5 ? '#f5ecd8' : '#2a3a38'
    ctx.fillRect(gx, gy, 1.2, 1.2)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  return canvas.toDataURL('image/png')
}

export function applyMonetPreviewFilter(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  dest: HTMLCanvasElement,
) {
  const ctx = dest.getContext('2d')
  if (!ctx) return

  const w = dest.width
  const h = dest.height
  ctx.filter = 'saturate(1.15) contrast(1.05) brightness(1.05) blur(0.6px)'
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)
  ctx.filter = 'none'

  const gradient = ctx.createLinearGradient(0, 0, w, h)
  gradient.addColorStop(0, 'rgba(232, 184, 109, 0.12)')
  gradient.addColorStop(0.5, 'rgba(90, 140, 150, 0.08)')
  gradient.addColorStop(1, 'rgba(200, 140, 150, 0.14)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}
