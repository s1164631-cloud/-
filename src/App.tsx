import { useEffect, useRef, useState } from 'react'
import { CaptureView } from './components/CaptureView'
import { GardenView } from './components/GardenView'
import { HealingCard } from './components/HealingCard'
import { IdentifyConfirm } from './components/IdentifyConfirm'
import { PlantSprite } from './components/PlantSprite'
import { ProcessingOverlay } from './components/ProcessingOverlay'
import type { GardenFlower, PlantTemplate } from './data/plants'
import { useBlowDetection } from './hooks/useBlowDetection'
import { useHandTracking } from './hooks/useHandTracking'
import {
  GestureController,
  clampGardenPos,
  type GestureState,
} from './lib/handGesture'
import {
  identifyPlant,
  pickManualPlant,
  type IdentifyResult,
} from './lib/identify'
import { applyMonetFilter } from './lib/monetFilter'
import { getTimeOfDay, loadGarden, saveGarden } from './lib/storage'
import { useAudio } from './hooks/useAudio'
import './App.css'

type Mode = 'garden' | 'capture' | 'confirm' | 'success'

type PendingResult = {
  flower: GardenFlower
}

type PendingIdentify = {
  rawDataUrl: string
  monetUrl: string
  result: IdentifyResult
}

function randomPosition(existing: GardenFlower[]) {
  for (let i = 0; i < 20; i++) {
    const x = 12 + Math.random() * 76
    const y = 38 + Math.random() * 42
    const ok = existing.every((f) => Math.hypot(f.x - x, f.y - y) > 10)
    if (ok) return { x, y }
  }
  return { x: 20 + Math.random() * 60, y: 45 + Math.random() * 35 }
}

export default function App() {
  const [flowers, setFlowers] = useState<GardenFlower[]>(() => loadGarden())
  const [mode, setMode] = useState<Mode>('garden')
  const [processing, setProcessing] = useState(false)
  const [selected, setSelected] = useState<GardenFlower | null>(null)
  const [pending, setPending] = useState<PendingResult | null>(null)
  const [pendingIdentify, setPendingIdentify] =
    useState<PendingIdentify | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const timeOfDay = getTimeOfDay()
  const {
    bgmOn,
    bgmMissingFile,
    toggleBgm,
    playSfx,
  } = useAudio()

  // Interaction modules
  const [handEnabled, setHandEnabled] = useState(false)
  const [blowEnabled, setBlowEnabled] = useState(false)
  const gestureRef = useRef(new GestureController())
  const [gestureState, setGestureState] = useState<GestureState>('idle')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [heldId, setHeldId] = useState<string | null>(null)
  const [heldPos, setHeldPos] = useState<{ x: number; y: number } | null>(null)
  const [cursorX, setCursorX] = useState(50)
  const [cursorY, setCursorY] = useState(50)
  const [gestureHint, setGestureHint] = useState<string | null>(null)

  const inGarden = mode === 'garden'
  const {
    status: handStatus,
    error: handError,
    hand,
    videoEl: handVideo,
  } = useHandTracking(handEnabled && inGarden)

  const {
    windStrength,
    triggered: windTriggered,
    error: blowError,
    ready: blowReady,
    blowing,
    micLevel,
    triggerDemoWind,
  } = useBlowDetection(blowEnabled && inGarden)

  const flowersRef = useRef(flowers)
  flowersRef.current = flowers
  const heldPosRef = useRef(heldPos)
  heldPosRef.current = heldPos

  useEffect(() => {
    saveGarden(flowers)
  }, [flowers])

  // Gesture state machine tick
  useEffect(() => {
    if (!handEnabled || !inGarden) {
      gestureRef.current.reset()
      setGestureState('idle')
      setHoverId(null)
      setHeldId(null)
      setHeldPos(null)
      setGestureHint(null)
      return
    }

    const frame = gestureRef.current.step(
      hand,
      flowersRef.current.map((f) => ({ id: f.id, x: f.x, y: f.y })),
    )

    setGestureState(frame.state)
    setHoverId(frame.hoverId)
    setCursorX(frame.cursorX)
    setCursorY(frame.cursorY)
    setGestureHint(frame.hint)

    if (frame.state === 'move' && frame.heldId && frame.hand?.active) {
      const pos = clampGardenPos(frame.cursorX, frame.cursorY - 4)
      setHeldId(frame.heldId)
      setHeldPos(pos)
    } else if (frame.state === 'grab' && frame.heldId) {
      setHeldId(frame.heldId)
    }

    if (frame.state === 'settle' && frame.heldId) {
      const id = frame.heldId
      const current = heldPosRef.current
      const drop = clampGardenPos(
        current?.x ?? frame.cursorX,
        current?.y ?? frame.cursorY,
      )
      setFlowers((prev) =>
        prev.map((f) => (f.id === id ? { ...f, x: drop.x, y: drop.y } : f)),
      )
      setHeldId(null)
      setHeldPos(null)
      gestureRef.current.acknowledgeSettle()
      setGestureState('idle')
      setGestureHint(null)
    }
  }, [hand, handEnabled, inGarden])

  const plantFromTemplate = (
    plant: PlantTemplate,
    monetUrl: string,
  ) => {
    void playSfx('success')
    const pos = randomPosition(flowers)
    const flower: GardenFlower = {
      id: crypto.randomUUID(),
      plantId: plant.id,
      name: plant.name,
      scientificName: plant.scientificName,
      languageOfFlower: plant.languageOfFlower,
      healingQuote: plant.healingQuote,
      imageDataUrl: monetUrl,
      plantedAt: new Date().toISOString(),
      x: pos.x,
      y: pos.y,
      scale: 0.85 + Math.random() * 0.35,
      palette: plant.palette,
    }
    setFlowers((prev) => [...prev, flower])
    setHighlightId(flower.id)
    setPending({ flower })
    setPendingIdentify(null)
    setMode('success')
    window.setTimeout(() => setHighlightId(null), 4000)
  }

  const processImage = async (
    rawDataUrl: string,
    forcedPlantId?: string,
  ) => {
    setProcessing(true)
    setMode('garden')

    try {
      const img = await loadImage(rawDataUrl)
      const monetUrl = await applyMonetFilter(img, {
        brushSize: 8,
        paintIntensity: 0.78,
        softness: 0.55,
        bloomStrength: 0.32,
      })

      if (forcedPlantId) {
        await wait(1200)
        const result = pickManualPlant(forcedPlantId)
        plantFromTemplate(result.plant, monetUrl)
        return
      }

      const result = await identifyPlant(rawDataUrl)
      await wait(1600)

      setPendingIdentify({ rawDataUrl, monetUrl, result })
      setMode('confirm')
    } catch (err) {
      console.error(err)
      alert('處理失敗，請再試一次。')
      setMode('capture')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="app-shell">
      {(mode === 'garden' || mode === 'confirm' || mode === 'success') && (
        <GardenView
          flowers={flowers}
          timeOfDay={timeOfDay}
          soundOn={bgmOn}
          onToggleSound={() => {
            void playSfx('click')
            void toggleBgm()
          }}
          bgmMissing={bgmMissingFile}
          onCapture={() => {
            void playSfx('click')
            setMode('capture')
          }}
          onSelectFlower={(f) => {
            void playSfx('select')
            setSelected(f)
          }}
          onDeleteFlower={(id) => {
            void playSfx('click')
            setFlowers((prev) => prev.filter((f) => f.id !== id))
          }}
          highlightId={highlightId}
          handEnabled={handEnabled}
          blowEnabled={blowEnabled}
          onToggleHand={() => {
            void playSfx('click')
            setHandEnabled((v) => !v)
          }}
          onToggleBlow={() => {
            void playSfx('click')
            setBlowEnabled((v) => !v)
          }}
          playSfx={playSfx}
          gestureState={gestureState}
          cursorX={cursorX}
          cursorY={cursorY}
          handActive={!!hand?.active}
          hoverId={hoverId}
          heldId={heldId}
          heldPos={heldPos}
          gestureHint={gestureHint}
          handStatus={handStatus}
          handError={handError}
          handVideo={handVideo}
          windStrength={windStrength}
          windTriggered={windTriggered}
          blowError={blowError}
          blowReady={blowReady}
          blowing={blowing}
          micLevel={micLevel}
          onDemoWind={triggerDemoWind}
        />
      )}

      {mode === 'capture' && (
        <CaptureView
          onCancel={() => {
            void playSfx('click')
            setMode('garden')
          }}
          onCapture={(url) => {
            void playSfx('click')
            void processImage(url)
          }}
          onPickPlant={(plantId, url) => {
            void playSfx('select')
            void processImage(url, plantId)
          }}
        />
      )}

      {mode === 'confirm' && pendingIdentify && (
        <IdentifyConfirm
          previewUrl={pendingIdentify.monetUrl}
          result={pendingIdentify.result}
          onConfirm={(plant) =>
            plantFromTemplate(plant, pendingIdentify.monetUrl)
          }
          onRetry={() => {
            void playSfx('click')
            setPendingIdentify(null)
            setMode('capture')
          }}
        />
      )}

      {mode === 'success' && pending && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-bloom success-bloom-plant">
              <PlantSprite flower={pending.flower} showLabel={false} />
            </div>
            <h2>{pending.flower.name}</h2>
            <p className="success-sci">{pending.flower.scientificName}</p>
            <p className="success-meaning">{pending.flower.languageOfFlower}</p>
            <p className="success-growth">已種下種子 · 明天會長出幼苗</p>
            <div className="success-actions">
              <button
                type="button"
                className="solid-btn"
                onClick={() => {
                  void playSfx('select')
                  setSelected(pending.flower)
                  setMode('garden')
                  setPending(null)
                }}
              >
                查看卡片
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  void playSfx('click')
                  setPending(null)
                  setMode('capture')
                }}
              >
                再拍一張
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  void playSfx('click')
                  setPending(null)
                  setMode('garden')
                }}
              >
                回到花園
              </button>
            </div>
          </div>
        </div>
      )}

      <ProcessingOverlay active={processing} />

      {selected && (
        <HealingCard
          flower={selected}
          onClose={() => {
            void playSfx('click')
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
