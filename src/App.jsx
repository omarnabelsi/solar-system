import { useEffect, useRef, useState } from 'react'
import { runAssistantPrompt } from './ai/assistantEngine'
import { TOUR_SEQUENCE } from './ai/spaceKnowledge'
import SpaceScene from './3d/SpaceScene'
import UI from './ui/UI'

function createMessage(role, text) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    text,
  }
}

function App() {
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [cameraMode, setCameraMode] = useState('orbit')
  const [warpEnabled, setWarpEnabled] = useState(false)
  const [isTraveling, setIsTraveling] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const tourStepRef = useRef(0)

  const [aiMessages, setAiMessages] = useState([
    createMessage(
      'assistant',
      'Mission control online. Ask me to navigate, explain planets, or start a guided tour.',
    ),
  ])

  useEffect(() => {
    if (!isTourActive) {
      return
    }

    const nextTarget = TOUR_SEQUENCE[tourStepRef.current % TOUR_SEQUENCE.length]
    setSelectedObjectId(nextTarget)
    setCameraMode('orbit')

    const timerId = window.setTimeout(() => {
      tourStepRef.current = (tourStepRef.current + 1) % TOUR_SEQUENCE.length
      setTourStep(tourStepRef.current)
    }, 9000)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isTourActive, tourStep])

  const appendMessage = (role, text) => {
    setAiMessages((previous) => [...previous.slice(-20), createMessage(role, text)])
  }

  const applyAssistantCommands = (commands) => {
    commands.forEach((command) => {
      if (command.type === 'select-object') {
        setSelectedObjectId(command.id)
        setIsTourActive(false)
      }

      if (command.type === 'set-camera-mode') {
        setCameraMode(command.mode)
      }

      if (command.type === 'set-warp') {
        setWarpEnabled(command.enabled)
      }

      if (command.type === 'start-tour') {
        tourStepRef.current = 0
        setTourStep(0)
        setIsTourActive(true)
      }

      if (command.type === 'stop-tour') {
        setIsTourActive(false)
      }
    })
  }

  const handleSendPrompt = (prompt) => {
    appendMessage('user', prompt)

    const response = runAssistantPrompt({
      prompt,
      selectedObjectId,
    })

    appendMessage('assistant', response.assistantMessage)
    applyAssistantCommands(response.commands)
  }

  const handleSelectObject = (objectId) => {
    setSelectedObjectId(objectId)
    if (objectId) {
      setIsTourActive(false)
    }
  }

  const handleCloseSelection = () => {
    setSelectedObjectId(null)
    setCameraMode('orbit')
    setIsTourActive(false)
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <SpaceScene
        selectedObjectId={selectedObjectId}
        onSelectObject={handleSelectObject}
        cameraMode={cameraMode}
        warpEnabled={warpEnabled}
        onTravelStateChange={setIsTraveling}
      />
      <UI
        selectedObjectId={selectedObjectId}
        cameraMode={cameraMode}
        warpEnabled={warpEnabled}
        isTourActive={isTourActive}
        aiMessages={aiMessages}
        isTraveling={isTraveling}
        onCloseSelection={handleCloseSelection}
        onSelectObject={handleSelectObject}
        onCameraModeChange={(mode) => {
          setCameraMode(mode)
          if (mode !== 'orbit') {
            setIsTourActive(false)
          }
        }}
        onWarpToggle={setWarpEnabled}
        onTourToggle={(enabled) => {
          if (enabled) {
            tourStepRef.current = 0
            setTourStep(0)
            setIsTourActive(true)
            setCameraMode('orbit')
            return
          }

          setIsTourActive(false)
        }}
        onSendPrompt={handleSendPrompt}
      />
    </main>
  )
}

export default App
