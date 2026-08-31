import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import {
  landmarkToGarden,
  pinchDistance,
  type HandSample,
} from '../lib/handGesture'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export type HandTrackingStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'denied'

export function useHandTracking(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const [status, setStatus] = useState<HandTrackingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hand, setHand] = useState<HandSample | null>(null)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const grabbingRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      setHand(null)
      setVideoEl(null)
      setStatus('idle')
      return
    }

    let cancelled = false

    const boot = async () => {
      setStatus('loading')
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const video = document.createElement('video')
        video.playsInline = true
        video.muted = true
        video.srcObject = stream
        await video.play()
        videoRef.current = video
        setVideoEl(video)

        const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        })
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setStatus('ready')

        const loop = () => {
          const lm = landmarkerRef.current
          const v = videoRef.current
          if (!lm || !v || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop)
            return
          }
          const result = lm.detectForVideo(v, performance.now())
          if (result.landmarks?.[0]) {
            const marks = result.landmarks[0]
            const thumb = marks[4]
            const index = marks[8]
            const palm = marks[9]
            const dist = pinchDistance(thumb, index)
            grabbingRef.current =
              dist < 0.05
                ? true
                : dist > 0.12
                  ? false
                  : grabbingRef.current
            const pos = landmarkToGarden(palm, true)
            setHand({
              active: true,
              x: pos.x,
              y: pos.y,
              pinchDist: dist,
              grabbing: grabbingRef.current,
            })
          } else {
            setHand({
              active: false,
              x: 50,
              y: 50,
              pinchDist: 1,
              grabbing: false,
            })
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        console.error(err)
        const denied =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setStatus(denied ? 'denied' : 'error')
        setError(
          denied
            ? '請允許攝影機權限以啟用手勢取放'
            : '手勢追蹤啟動失敗，請稍後再試',
        )
      }
    }

    void boot()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      videoRef.current = null
      setVideoEl(null)
    }
  }, [enabled])

  return { status, error, hand, videoEl }
}
