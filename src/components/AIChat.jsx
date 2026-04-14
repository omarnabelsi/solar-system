import { useEffect, useRef, useState } from 'react'

function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={
        'rounded-xl border px-3 py-2 text-sm leading-relaxed ' +
        (isAssistant
          ? 'self-start border-cyan-200/20 bg-cyan-400/15 text-cyan-50'
          : 'self-end border-white/20 bg-white/10 text-white')
      }
    >
      {message.text}
    </div>
  )
}

function AIChat({ aiMessages, isTraveling, isThinking, onSendPrompt }) {
  const [promptInput, setPromptInput] = useState('')
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [aiMessages, isThinking])

  const handlePromptSubmit = async (event) => {
    event.preventDefault()
    const trimmed = promptInput.trim()

    if (!trimmed || isThinking) {
      return
    }

    setPromptInput('')
    await onSendPrompt(trimmed)
  }

  return (
    <section className="pointer-events-auto absolute bottom-3 left-3 right-3 flex max-h-[54vh] flex-col rounded-2xl border border-white/15 bg-slate-950/42 p-3 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6 md:right-auto md:w-[470px] md:p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-cyan-100">AI Mission Copilot</h3>
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-200">
          {isThinking ? 'Thinking' : isTraveling ? 'Navigating' : 'Standby'}
        </span>
      </div>

      <div ref={messagesRef} className="mb-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {aiMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <form onSubmit={handlePromptSubmit} className="flex gap-2">
        <input
          value={promptInput}
          onChange={(event) => setPromptInput(event.target.value)}
          placeholder="Ask about planets, request navigation, or start a guided tour..."
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-300/70"
        />
        <button
          type="submit"
          disabled={isThinking}
          className="rounded-xl border border-cyan-300/45 bg-cyan-300/20 px-3 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-300/30 disabled:opacity-55"
        >
          Send
        </button>
      </form>
    </section>
  )
}

export default AIChat
