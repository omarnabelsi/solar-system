export const PLANET_INFO = {
  Mercury: {
    name: 'Mercury',
    description: 'The smallest planet, fast and scorched, racing around the Sun on a tight orbit.',
  },
  Venus: {
    name: 'Venus',
    description: 'Wrapped in dense clouds, Venus is bright, hot, and full of dramatic atmosphere.',
  },
  Earth: {
    name: 'Earth',
    description: 'Our blue world, rich with oceans and life, balancing light and shadow.',
  },
  Mars: {
    name: 'Mars',
    description: 'A dusty red planet with giant canyons and ancient volcanic landscapes.',
  },
  Jupiter: {
    name: 'Jupiter',
    description: 'A massive gas giant with turbulent bands and powerful storms.',
  },
  Saturn: {
    name: 'Saturn',
    description: 'Known for iconic rings, Saturn is elegant, vast, and softly golden.',
  },
  Uranus: {
    name: 'Uranus',
    description: 'An icy giant with a cool cyan tone and a uniquely tilted spin.',
  },
  Neptune: {
    name: 'Neptune',
    description: 'A deep-blue giant where strong winds sweep through a distant, cold world.',
  },
}

function UI({ selectedPlanetId, isVisible, onClose }) {
  const selectedInfo = selectedPlanetId ? PLANET_INFO[selectedPlanetId] : null

  return (
    <aside
      className={
        'pointer-events-none absolute left-3 right-3 top-3 z-20 mx-auto max-w-md transform transition-all duration-300 ease-out md:left-auto md:right-6 md:top-6 ' +
        (isVisible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0')
      }
      aria-hidden={!isVisible}
    >
      <div className="pointer-events-auto rounded-2xl border border-white/20 bg-slate-900/40 p-4 text-slate-100 shadow-2xl backdrop-blur-xl md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300/85">Selected Planet</p>
            <h2 className="mt-1 text-xl font-semibold text-white md:text-2xl">
              {selectedInfo ? selectedInfo.name : 'Solar System'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!isVisible}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-200/95 md:text-[0.95rem]">
          {selectedInfo
            ? selectedInfo.description
            : 'Click any planet to inspect details and travel the camera.'}
        </p>
      </div>
    </aside>
  )
}

export default UI
