import { useEffect, useMemo, useState } from 'react'
import type { GardenFlower } from '../data/plants'
import type { GestureState } from '../lib/handGesture'
import { GROWTH_LABEL, daysSincePlanted, getGrowthStage } from '../lib/growth'
import { GestureCoach, GestureGuide } from './GestureGuide'
import { HandCursor } from './HandCursor'
import { Particles } from './Particles'
import { PlantSprite } from './PlantSprite'
import { WindOverlay } from './WindOverlay'

type Props = {
  flowers: GardenFlower[]
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night'
  soundOn: boolean
  onToggleSound: () => void
  bgmMissing?: boolean
  playSfx?: (name: 'click' | 'select' | 'success') => void
  onCapture: () => void
  onSelectFlower: (flower: GardenFlower) => void
  onDeleteFlower: (id: string) => void
  highlightId?: string | null
  // Gesture / wind
  handEnabled: boolean
  blowEnabled: boolean
  onToggleHand: () => void
  onToggleBlow: () => void
  gestureState: GestureState
  cursorX: number
  cursorY: number
  handActive: boolean
  hoverId: string | null
  heldId: string | null
  heldPos: { x: number; y: number } | null
  gestureHint: string | null
  handStatus: string
  handError: string | null
  handVideo: HTMLVideoElement | null
  windStrength: number
  windTriggered: boolean
  blowError: string | null
  blowReady?: boolean
  blowing?: boolean
  micLevel?: number
  onDemoWind?: () => void
}

const TIME_LABEL = {
  dawn: '黎明',
  day: '白晝',
  dusk: '黃昏',
  night: '夜晚',
} as const

export function GardenView({
  flowers,
  timeOfDay,
  soundOn,
  onToggleSound,
  bgmMissing = false,
  playSfx,
  onCapture,
  onSelectFlower,
  onDeleteFlower,
  highlightId,
  handEnabled,
  blowEnabled,
  onToggleHand,
  onToggleBlow,
  gestureState,
  cursorX,
  cursorY,
  handActive,
  hoverId,
  heldId,
  heldPos,
  gestureHint,
  handStatus,
  handError,
  handVideo,
  windStrength,
  windTriggered,
  blowError,
  blowReady = false,
  blowing = false,
  micLevel = 0,
  onDemoWind,
}: Props) {
  const [listOpen, setListOpen] = useState(false)
  const [guideMode, setGuideMode] = useState<'hand' | 'blow' | null>(null)

  // Auto-open guided walkthrough the first time each mode is enabled
  useEffect(() => {
    if (!handEnabled) return
    const seen = localStorage.getItem('cmg-guide-hand')
    if (!seen) setGuideMode('hand')
  }, [handEnabled])

  useEffect(() => {
    if (!blowEnabled) return
    const seen = localStorage.getItem('cmg-guide-blow')
    if (!seen) setGuideMode('blow')
  }, [blowEnabled])

  const closeGuide = () => {
    if (guideMode === 'hand') localStorage.setItem('cmg-guide-hand', '1')
    if (guideMode === 'blow') localStorage.setItem('cmg-guide-blow', '1')
    setGuideMode(null)
  }

  const openFlower = (flower: GardenFlower) => {
    setListOpen(false)
    onSelectFlower(flower)
  }
  const clock = useMemo(
    () =>
      new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  const ordered = useMemo(
    () => [...flowers].sort((a, b) => a.y - b.y),
    [flowers],
  )

  return (
    <div
      className={`garden-view tod-${timeOfDay}`}
      style={{ ['--wind' as string]: windStrength }}
    >
      <div className="sky" />
      <div className="mist" style={{ ['--wind' as string]: windStrength }} />
      <div className={`water ${windStrength > 0.08 ? 'is-windy' : ''}`}>
        <div className="water-sheen" />
        <div className="water-ripples" />
      </div>
      <div className="shore" />
      <Particles timeOfDay={timeOfDay} />
      <WindOverlay windStrength={windStrength} showBanner={windTriggered} />

      <header className="top-bar">
        <span className="clock">
          {clock} · {TIME_LABEL[timeOfDay]}
        </span>
        <div className="brand">
          <h1>Cyber Monet Garden</h1>
          <p className="brand-zh">賽博莫內花園</p>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleSound}
          aria-label={soundOn ? '關閉背景音樂' : '開啟背景音樂'}
          title="背景音樂"
        >
          {soundOn ? '♪' : '🔇'}
        </button>
      </header>

      <p className="slogan">每一朵花，都是一次深呼吸。</p>
      {soundOn && bgmMissing && (
        <p className="bgm-missing-hint">
          未找到 bgm.mp3，已使用柔和合成背景音（可放到 public/sounds/bgm.mp3）
        </p>
      )}
      {soundOn && !bgmMissing && (
        <p className="bgm-credit">
          BGM: Blossom — Roa Music (CC BY 3.0)
        </p>
      )}

      <div className="flower-field">
        {ordered.map((flower) => {
          const stage = getGrowthStage(flower.plantedAt)
          const days = daysSincePlanted(flower.plantedAt)
          const isHeld = heldId === flower.id
          const isHover = hoverId === flower.id && !isHeld
          const x = isHeld && heldPos ? heldPos.x : flower.x
          const y = isHeld && heldPos ? heldPos.y : flower.y

          return (
            <button
              key={flower.id}
              type="button"
              className={[
                'garden-flower',
                `stage-${stage}`,
                highlightId === flower.id ? 'is-new' : '',
                isHover ? 'is-hover' : '',
                isHeld ? 'is-held' : '',
                windStrength > 0.05 ? 'is-windy' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                zIndex: isHeld ? 90 : Math.round(y),
                ['--scale' as string]: flower.scale,
                ['--c0' as string]: flower.palette[0],
                ['--c1' as string]: flower.palette[1],
                ['--c2' as string]: flower.palette[2],
                ['--wind' as string]: windStrength,
                animationDelay: `${((flower.x + flower.y) % 7) * 0.15}s`,
              }}
              onClick={() => openFlower(flower)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (confirm(`將「${flower.name}」移出花園？`)) {
                  onDeleteFlower(flower.id)
                }
              }}
              aria-label={`${flower.name}，${GROWTH_LABEL[stage]}，種植 ${days} 天，點擊查看療癒卡片`}
            >
              <PlantSprite flower={flower} showLabel={false} />
              <span className="flower-tip">
                {flower.name} · {GROWTH_LABEL[stage]}
                <small>第 {days} 天</small>
              </span>
            </button>
          )
        })}
      </div>

      {handEnabled && (
        <HandCursor
          x={cursorX}
          y={cursorY}
          state={gestureState}
          active={handActive || gestureState === 'move'}
          video={handStatus === 'ready' ? handVideo : null}
        />
      )}

      <GestureCoach
        handEnabled={handEnabled}
        handReady={handStatus === 'ready'}
        gestureState={gestureState}
        handActive={handActive}
        onOpenGuide={() => setGuideMode('hand')}
      />

      {(gestureHint || handError || blowError) && (
        <p className="gesture-hint">
          {gestureHint || handError || blowError}
        </p>
      )}

      <div className="interact-toggles">
        <button
          type="button"
          className={`toggle-chip ${handEnabled ? 'on' : ''}`}
          onClick={onToggleHand}
        >
          ✋ 手勢取放 {handEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          className={`toggle-chip ${blowEnabled ? 'on' : ''}`}
          onClick={onToggleBlow}
        >
          💨 吹氣風動 {blowEnabled ? 'ON' : 'OFF'}
        </button>
        {blowEnabled && (
          <div className={`mic-meter ${blowing ? 'is-blowing' : ''}`}>
            <div className="mic-meter-bar">
              <span style={{ width: `${Math.round(micLevel * 100)}%` }} />
            </div>
            <small>
              {!blowReady
                ? '啟動麥克風…'
                : blowing
                  ? '偵測到吹氣'
                  : '對準麥克風輕吹～'}
            </small>
            {onDemoWind && (
              <button
                type="button"
                className="mic-demo"
                onClick={() => {
                  playSfx?.('click')
                  onDemoWind()
                }}
              >
                試吹風效
              </button>
            )}
          </div>
        )}
        {(handEnabled || blowEnabled) && (
          <button
            type="button"
            className="toggle-chip"
            onClick={() => setGuideMode(handEnabled ? 'hand' : 'blow')}
          >
            ？ 操作說明
          </button>
        )}
      </div>

      {guideMode && (
        <GestureGuide
          key={guideMode}
          open
          mode={guideMode}
          onClose={closeGuide}
        />
      )}

      <nav className="bottom-nav">
        <button type="button" className="nav-action primary" onClick={onCapture}>
          <span className="nav-ico">📷</span>
          <span>
            <strong>拍攝</strong>
            <small>識別新植物</small>
          </span>
        </button>
        <button
          type="button"
          className="nav-action"
          onClick={() => setListOpen((v) => !v)}
        >
          <span className="nav-ico">🌿</span>
          <span>
            <strong>我的花園</strong>
            <small>{flowers.length} 株已種植</small>
          </span>
        </button>
        <button type="button" className="nav-action" onClick={onToggleSound}>
          <span className="nav-ico">🎵</span>
          <span>
            <strong>音樂</strong>
            <small>{soundOn ? '背景音樂開啟' : '背景音樂關閉'}</small>
          </span>
        </button>
      </nav>

      <p className="footer-hint">
        {handEnabled
          ? '捏合拇指與食指摘花，張開放下 · 對著麥克風吹氣讓風來'
          : '將植物對準框框，輕觸拍攝按鈕'}
      </p>

      {listOpen && (
        <aside className="garden-list">
          <header>
            <h3>已種植的花</h3>
            <button type="button" onClick={() => setListOpen(false)}>
              關閉
            </button>
          </header>
          <ul>
            {flowers.map((f) => {
              const stage = getGrowthStage(f.plantedAt)
              const days = daysSincePlanted(f.plantedAt)
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => openFlower(f)}>
                    <span className="list-plant">
                      <PlantSprite flower={f} showLabel={false} />
                    </span>
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {GROWTH_LABEL[stage]} · 第 {days} 天
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      )}
    </div>
  )
}
