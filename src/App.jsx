import { useCallback, useEffect, useRef, useState } from 'react'
import { runAssistantPrompt } from './ai/assistantEngine'
import Scene from './components/Scene'
import UI from './components/UI'
import { startTour as createTourController } from './systems/TourSystem'

function normalizeCameraMode(mode) {
  const normalizedMode = (mode || '').toLowerCase()

  if (
    normalizedMode === 'flight'
    || normalizedMode === 'ship'
    || normalizedMode === 'free'
    || normalizedMode === 'spaceship'
    || normalizedMode === 'cockpit'
  ) {
    return 'spaceship'
  }

  if (
    normalizedMode === 'planetfocus'
    || normalizedMode === 'planet-focus'
    || normalizedMode === 'focus'
    || normalizedMode === 'follow'
    || normalizedMode === 'travel'
  ) {
    return 'planetFocus'
  }

  if (normalizedMode === 'tour') {
    return 'tour'
  }

  if (normalizedMode === 'orbit') {
    return 'orbit'
  }

  return 'orbit'
}

function createMessage(role, text) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    text,
  }
}

function App() {
  const [selectedPlanet, setSelectedPlanet] = useState(null)
  const [mode, setMode] = useState('orbit')
  const [warpEnabled, setWarpEnabled] = useState(false)
  const [isTraveling, setIsTraveling] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const tourControllerRef = useRef(null)
  const tourArrivalTokenRef = useRef('')
  const selectedObjectId = selectedPlanet?.id || null

  const [aiMessages, setAiMessages] = useState([
    createMessage(
      'assistant',
      'Mission control online. Ask me to navigate, explain planets, or start a guided tour.',
    ),
  ])

  useEffect(() => {
    return () => {
      tourControllerRef.current?.stopTour()
      tourControllerRef.current = null
    }
  }, [])

  const appendMessage = useCallback((role, text) => {
    setAiMessages((previous) => [...previous.slice(-20), createMessage(role, text)])
  }, [])

  const stopTour = useCallback((resetView = true) => {
    tourControllerRef.current?.stopTour()
    tourControllerRef.current = null
    tourArrivalTokenRef.current = ''
    setIsTourActive(false)

    if (resetView) {
      setMode('orbit')
      setSelectedPlanet(null)
      setIsTraveling(false)
    }
  }, [])

  const startGuidedTour = useCallback(() => {
    if (isTraveling) {
      return
    }

    stopTour(false)
    setIsTourActive(true)
    setMode('tour')
    setSelectedPlanet(null)
    tourArrivalTokenRef.current = ''

    const controller = createTourController({
      dwellTimeMs: 2400,
      onVisit: (targetId) => {
        setSelectedPlanet({ id: targetId })
        setMode('tour')
        tourArrivalTokenRef.current = ''
      },
      onComplete: () => {
        setIsTourActive(false)
        setMode('orbit')
        setSelectedPlanet(null)
        setIsTraveling(false)
        tourControllerRef.current = null
        tourArrivalTokenRef.current = ''
      },
    })

    tourControllerRef.current = controller
    controller.begin()
  }, [isTraveling, stopTour])

  useEffect(() => {
    if (!isTourActive || mode !== 'tour' || isTraveling || !selectedPlanet?.id || !tourControllerRef.current) {
      return
    }

    const token = `${selectedPlanet.id}:${tourControllerRef.current.getCurrentIndex()}`
    if (tourArrivalTokenRef.current === token) {
      return
    }

    tourArrivalTokenRef.current = token
    tourControllerRef.current.notifyArrived()
  }, [isTourActive, mode, isTraveling, selectedPlanet?.id])

  const applyAssistantCommands = useCallback((commands) => {
    commands.forEach((command) => {
      if (command.type === 'select-object') {
        stopTour(false)
        setSelectedPlanet({ id: command.id })
        setMode('planetFocus')
      }

      if (command.type === 'set-camera-mode') {
        const nextMode = normalizeCameraMode(command.mode)

        if (nextMode === 'tour') {
          startGuidedTour()
          return
        }

        stopTour(false)

        if (nextMode === 'spaceship') {
          setSelectedPlanet(null)
          setMode('spaceship')
          return
        }

        if (nextMode === 'planetFocus') {
          setMode('planetFocus')
          return
        }

        setSelectedPlanet(null)
        setMode('orbit')
      }

      if (command.type === 'set-warp') {
        setWarpEnabled(command.enabled)
      }

      if (command.type === 'start-tour') {
        startGuidedTour()
      }

      if (command.type === 'stop-tour') {
        stopTour(true)
      }
    })
  }, [startGuidedTour, stopTour])

  const handleSendPrompt = useCallback(async (prompt) => {
    appendMessage('user', prompt)
    setIsAiThinking(true)

    try {
      const response = await runAssistantPrompt({
        prompt,
        selectedObjectId,
      })

      appendMessage('assistant', response.assistantMessage)
      applyAssistantCommands(response.commands)
    } finally {
      setIsAiThinking(false)
    }
  }, [appendMessage, applyAssistantCommands, selectedObjectId])

  const handleSelectObject = useCallback((objectId, payload) => {
    if (isTraveling) {
      return
    }

    if (!objectId) {
      setSelectedPlanet(null)
      setMode('orbit')
      return
    }

    stopTour(false)
    setSelectedPlanet(payload ? { id: objectId, ...payload } : { id: objectId })
    setMode('planetFocus')
  }, [isTraveling, stopTour])

  const handleCameraModeChange = useCallback((nextMode) => {
    const normalizedMode = normalizeCameraMode(nextMode)

    if (normalizedMode === 'tour') {
      startGuidedTour()
      return
    }

    stopTour(false)

    if (normalizedMode === 'spaceship') {
      setSelectedPlanet(null)
      setMode('spaceship')
      return
    }

    if (normalizedMode === 'planetFocus') {
      setMode('planetFocus')
      return
    }

    setSelectedPlanet(null)
    setMode('orbit')
  }, [startGuidedTour, stopTour])

  const handleToggleSpaceshipMode = useCallback(() => {
    stopTour(false)

    if (mode === 'spaceship') {
      setMode('orbit')
      return
    }

    setSelectedPlanet(null)
    setMode('spaceship')
  }, [mode, stopTour])

  const handleCloseSelection = useCallback(() => {
    setSelectedPlanet(null)
    setMode('orbit')
    setIsTraveling(false)
    if (isTourActive) {
      stopTour(false)
    }
  }, [isTourActive, stopTour])

  const handleStartTour = useCallback(() => {
    startGuidedTour()
  }, [startGuidedTour])

  const handleStopTour = useCallback(() => {
    stopTour(true)
  }, [stopTour])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <Scene
        selectedPlanet={selectedPlanet}
        onSelectPlanet={handleSelectObject}
        cameraMode={mode}
        warpEnabled={warpEnabled}
        isTraveling={isTraveling}
        onTravelStateChange={setIsTraveling}
        onCameraModeChange={handleCameraModeChange}
      />
      <UI
        selectedObjectId={selectedObjectId}
        cameraMode={mode}
        warpEnabled={warpEnabled}
        isTourActive={isTourActive}
        aiMessages={aiMessages}
        isTraveling={isTraveling}
        isAiThinking={isAiThinking}
        onCloseSelection={handleCloseSelection}
        onSelectObject={handleSelectObject}
        onCameraModeChange={handleCameraModeChange}
        onToggleSpaceshipMode={handleToggleSpaceshipMode}
        onWarpToggle={setWarpEnabled}
        onStartTour={handleStartTour}
        onStopTour={handleStopTour}
        onSendPrompt={handleSendPrompt}
      />
    </main>
  )
}

export default App
