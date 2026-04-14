import { useMemo } from 'react'
import AIChat from './AIChat'
import { PLANET_IDS, getObjectKnowledge } from '../ai/spaceKnowledge'

function ModeButton({ active, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ' +
        (active
          ? 'border-cyan-300/80 bg-cyan-300/20 text-cyan-100'
          : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/12')
      }
    >
      {label}
    </button>
  )
}

function UI({
  selectedObjectId,
  cameraMode,
  warpEnabled,
  isTourActive,
  aiMessages,
  isTraveling,
  isAiThinking,
  onCloseSelection,
  onSelectObject,
  onCameraModeChange,
  onToggleSpaceshipMode,
  onWarpToggle,
  onStartTour,
  onStopTour,
  onSendPrompt,
}) {
  const selectedInfo = useMemo(
    () => getObjectKnowledge(selectedObjectId),
    [selectedObjectId],
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 right-3 top-3 flex flex-col gap-3 md:left-6 md:right-6 md:top-6 md:flex-row md:items-start md:justify-between">
        <section className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-950/35 p-3 shadow-2xl backdrop-blur-xl md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton
              label="Orbit Mode"
              active={cameraMode === 'orbit'}
              onClick={() => onCameraModeChange('orbit')}
              disabled={isTraveling}
            />
            <ModeButton
              label={cameraMode === 'spaceship' ? 'Exit Spaceship' : 'Spaceship Mode'}
              active={cameraMode === 'spaceship'}
              onClick={onToggleSpaceshipMode}
              disabled={isTraveling}
            />
            <ModeButton
              label="Start Tour"
              active={isTourActive}
              onClick={onStartTour}
              disabled={isTourActive || isTraveling}
            />
            <ModeButton
              label="Stop Tour"
              active={false}
              onClick={onStopTour}
              disabled={!isTourActive}
            />
            <ModeButton
              label="Exit Planet Focus"
              active={false}
              onClick={onCloseSelection}
              disabled={cameraMode !== 'planetFocus'}
            />
            <ModeButton
              label={warpEnabled ? 'Warp On' : 'Warp Off'}
              active={warpEnabled}
              onClick={() => onWarpToggle(!warpEnabled)}
            />
          </div>

          <p className="mt-2 text-xs text-slate-300/90">
            Spaceship controls: W A S D thrust, mouse look, Shift boost, Space ascend, Ctrl descend.
          </p>

          {isTourActive ? (
            <p className="mt-1 text-xs text-cyan-200/90">
              Guided tour active{selectedInfo ? `: now viewing ${selectedInfo.name}.` : '.'}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {PLANET_IDS.map((planetId) => (
              <button
                key={planetId}
                type="button"
                onClick={() => onSelectObject(planetId)}
                disabled={isTraveling || cameraMode === 'tour'}
                className={
                  'rounded-md border px-2 py-1 text-[11px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ' +
                  (selectedObjectId === planetId
                    ? 'border-sky-200/70 bg-sky-300/20 text-sky-100'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/12')
                }
              >
                {planetId}
              </button>
            ))}
          </div>
        </section>

        <section
          className={
            'pointer-events-auto w-full max-w-md transform rounded-2xl border border-white/15 bg-slate-950/38 p-4 text-slate-100 shadow-2xl backdrop-blur-xl transition-all duration-300 ' +
            (selectedInfo ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')
          }
          aria-hidden={!selectedInfo}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/80">Inspection</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{selectedInfo?.name || 'None'}</h2>
            </div>
            <button
              type="button"
              onClick={onCloseSelection}
              disabled={!selectedInfo}
              className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-200/95">
            {selectedInfo?.shortDescription || 'Select an object to inspect details.'}
          </p>
          <p className="mt-2 text-xs text-slate-300/85">{selectedInfo?.lore || ''}</p>
        </section>
      </div>

      <AIChat
        aiMessages={aiMessages}
        isTraveling={isTraveling}
        isThinking={isAiThinking}
        onSendPrompt={onSendPrompt}
      />
    </div>
  )
}

export default UI
