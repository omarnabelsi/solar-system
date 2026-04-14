import { useMemo } from 'react'
import AIChat from './AIChat'
import { PLANET_IDS, getObjectKnowledge } from '../ai/spaceKnowledge'

function ModeButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ' +
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
  onWarpToggle,
  onTourToggle,
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
              label="Orbit"
              active={cameraMode === 'orbit'}
              onClick={() => onCameraModeChange('orbit')}
            />
            <ModeButton
              label="Follow"
              active={cameraMode === 'follow'}
              onClick={() => onCameraModeChange('follow')}
            />
            <ModeButton
              label="Flight"
              active={cameraMode === 'flight'}
              onClick={() => onCameraModeChange('flight')}
            />
            <ModeButton
              label={warpEnabled ? 'Warp On' : 'Warp Off'}
              active={warpEnabled}
              onClick={() => onWarpToggle(!warpEnabled)}
            />
            <ModeButton
              label={isTourActive ? 'Stop Tour' : 'Start Tour'}
              active={isTourActive}
              onClick={() => onTourToggle(!isTourActive)}
            />
          </div>

          <p className="mt-2 text-xs text-slate-300/90">
            Flight controls: W A S D move, Shift boost, Space ascend, Ctrl descend.
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {PLANET_IDS.map((planetId) => (
              <button
                key={planetId}
                type="button"
                onClick={() => onSelectObject(planetId)}
                className={
                  'rounded-md border px-2 py-1 text-[11px] transition-colors duration-200 ' +
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
