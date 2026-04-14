import {
  getObjectKnowledge,
  resolveObjectFromText,
  TOUR_SEQUENCE,
} from './spaceKnowledge'

const HELP_MESSAGE =
  'Try commands like "go to Mars", "start guided tour", "follow mode", "flight mode", "warp on", or ask "tell me about Saturn".'

function makeReplyWithFact(objectEntry) {
  return `${objectEntry.name}: ${objectEntry.shortDescription} ${objectEntry.lore}`
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  if (Array.isArray(payload?.output)) {
    for (const item of payload.output) {
      if (!Array.isArray(item?.content)) {
        continue
      }

      for (const part of item.content) {
        if (typeof part?.text === 'string' && part.text.trim()) {
          return part.text.trim()
        }

        if (typeof part?.output_text === 'string' && part.output_text.trim()) {
          return part.output_text.trim()
        }
      }
    }
  }

  return null
}

async function requestOpenAiReply({ prompt, selectedObjectId }) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const selected = selectedObjectId ? getObjectKnowledge(selectedObjectId) : null
    const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini'

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 220,
        input:
          'You are an AI mission copilot for a real-time 3D solar system app. Keep responses concise, accurate, and engaging. Current selected object: ' +
          (selected?.name || 'none') +
          '. User prompt: ' +
          prompt,
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    return extractResponseText(payload)
  } catch {
    return null
  }
}

export async function runAssistantPrompt({ prompt, selectedObjectId }) {
  const cleanedPrompt = (prompt || '').trim()

  if (!cleanedPrompt) {
    return {
      assistantMessage: 'Ready for your next mission command. ' + HELP_MESSAGE,
      commands: [],
    }
  }

  const lowerPrompt = cleanedPrompt.toLowerCase()
  const commands = []

  if (/(start|begin|launch).*(tour)|guided tour|tour mode|show me all planets/.test(lowerPrompt)) {
    commands.push({ type: 'start-tour', sequence: TOUR_SEQUENCE })
    return {
      assistantMessage:
        'Guided tour engaged. I will hop through the major planets in sequence.',
      commands,
    }
  }

  if (/(stop|end|cancel).*(tour)|exit tour/.test(lowerPrompt)) {
    commands.push({ type: 'stop-tour' })
    return {
      assistantMessage: 'Tour halted. Manual exploration controls restored.',
      commands,
    }
  }

  if (/ship mode|flight mode|first person|cockpit/.test(lowerPrompt)) {
    commands.push({ type: 'set-camera-mode', mode: 'flight' })
    return {
      assistantMessage:
        'Flight mode enabled. Use W A S D to move, Space and Ctrl for vertical thrust, and Shift for boost.',
      commands,
    }
  }

  if (/follow mode|track mode/.test(lowerPrompt)) {
    commands.push({ type: 'set-camera-mode', mode: 'follow' })
    return {
      assistantMessage:
        'Follow mode enabled. Select a target and the camera will trail it smoothly.',
      commands,
    }
  }

  if (/orbit mode|free orbit/.test(lowerPrompt)) {
    commands.push({ type: 'set-camera-mode', mode: 'orbit' })
    return {
      assistantMessage: 'Orbit mode re-enabled. Mouse orbit controls are active.',
      commands,
    }
  }

  if (/warp on|engage warp|enable warp/.test(lowerPrompt)) {
    commands.push({ type: 'set-warp', enabled: true })
    return {
      assistantMessage: 'Warp drive online. Travel acceleration increased.',
      commands,
    }
  }

  if (/warp off|disable warp|cut warp/.test(lowerPrompt)) {
    commands.push({ type: 'set-warp', enabled: false })
    return {
      assistantMessage: 'Warp drive disengaged. Returning to standard thrust.',
      commands,
    }
  }

  const navigationMatch = lowerPrompt.match(
    /(go to|navigate to|take me to|focus on|fly to|travel to)\s+([a-z\s]+)/,
  )

  if (navigationMatch) {
    const target = resolveObjectFromText(navigationMatch[2])

    if (target) {
      commands.push({ type: 'select-object', id: target.id })
      commands.push({ type: 'set-camera-mode', mode: 'orbit' })
      return {
        assistantMessage: `Navigating to ${target.name}. Cinematic approach engaged.`,
        commands,
      }
    }

    return {
      assistantMessage:
        'I could not find that target. Try a known object like Mercury, Earth, Saturn, or Voyager.',
      commands: [],
    }
  }

  const askedObject = resolveObjectFromText(lowerPrompt)
  if (askedObject && /(about|tell me|what is|details|info|describe|facts)/.test(lowerPrompt)) {
    const openAiReply = await requestOpenAiReply({
      prompt: cleanedPrompt,
      selectedObjectId,
    })

    return {
      assistantMessage: openAiReply || makeReplyWithFact(askedObject),
      commands: [],
    }
  }

  if (/where am i|current target|selected/.test(lowerPrompt)) {
    const selected = getObjectKnowledge(selectedObjectId)
    return {
      assistantMessage: selected
        ? `Current focus: ${selected.name}. ${selected.shortDescription}`
        : 'No active selection. Pick an object or ask me to navigate.',
      commands: [],
    }
  }

  const openAiFallback = await requestOpenAiReply({
    prompt: cleanedPrompt,
    selectedObjectId,
  })

  if (openAiFallback) {
    return {
      assistantMessage: openAiFallback,
      commands: [],
    }
  }

  return {
    assistantMessage:
      'Mission control online. I can explain space objects, navigate the camera, toggle flight or follow mode, and run guided tours. ' +
      HELP_MESSAGE,
    commands: [],
  }
}
