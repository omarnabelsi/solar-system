export const NASA_TOUR_SEQUENCE = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]

export function startTour({
  sequence = NASA_TOUR_SEQUENCE,
  dwellTimeMs = 2200,
  onVisit,
  onComplete,
}) {
  let isActive = true
  let currentIndex = 0
  let dwellTimerId = null

  const clearDwellTimer = () => {
    if (dwellTimerId !== null) {
      window.clearTimeout(dwellTimerId)
      dwellTimerId = null
    }
  }

  const visit = (index) => {
    if (!isActive) {
      return
    }

    const targetId = sequence[index]
    if (!targetId) {
      return
    }

    onVisit?.(targetId, index)
  }

  const advance = () => {
    if (!isActive) {
      return
    }

    currentIndex += 1

    if (currentIndex >= sequence.length) {
      isActive = false
      onComplete?.()
      return
    }

    visit(currentIndex)
  }

  return {
    begin() {
      visit(currentIndex)
    },
    notifyArrived() {
      if (!isActive) {
        return
      }

      clearDwellTimer()
      dwellTimerId = window.setTimeout(() => {
        advance()
      }, dwellTimeMs)
    },
    stopTour() {
      isActive = false
      clearDwellTimer()
    },
    isRunning() {
      return isActive
    },
    getCurrentIndex() {
      return currentIndex
    },
  }
}
