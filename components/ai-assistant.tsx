"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Phone, PhoneOff, MessageCircle } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AiAssistant() {
  const [tab, setTab] = useState<"chat" | "call">("chat")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm Momoyo's AI assistant. Feel free to ask me anything about her background, skills, or how to get in touch.",
    },
  ])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [callStatus, setCallStatus] = useState("Click Start Call to begin")
  const [callError, setCallError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const isCallActiveRef = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  const speak = (text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.1
    utterance.lang = "en-US"
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") ||
      v.name.includes("Zira") || v.name.toLowerCase().includes("female")
    )
    if (femaleVoice) utterance.voice = femaleVoice
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setCallError("Speech recognition not supported. Please use Chrome.")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setCallStatus("Listening...")
    }

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      setCallStatus(`You: "${transcript}"`)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: transcript }])
      setCallStatus("Momoyo is thinking...")

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: transcript }),
        })
        const data = await res.json()
        const reply = data.reply
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }])
        setCallStatus("Momoyo is speaking...")
        speak(reply, () => {
          if (isCallActiveRef.current) {
            setCallStatus("Your turn — speak now")
            startListening()
          }
        })
      } catch {
        setCallStatus("Error. Tap Speak to try again.")
      }
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error === "no-speech") {
        setCallStatus("No speech detected. Tap Speak to try again.")
      } else {
        setCallStatus(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  const startCall = () => {
    setIsCallActive(true)
    isCallActiveRef.current = true
    setCallError(null)
    setCallStatus("Momoyo is greeting you...")
    speak("Hello! I'm Momoyo's AI assistant. What would you like to know about her?", () => {
      setCallStatus("Your turn — speak now")
      startListening()
    })
  }

  const endCall = () => {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    isCallActiveRef.current = false
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setCallStatus("Click Start Call to begin")
  }

  const handleSend = () => {
    if (!input.trim()) return
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    ;(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage.content }),
        })
        const data = await res.json()
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply }])
      } catch {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I couldn't reach the assistant right now." }])
      }
    })()
  }

  return (
    <section id="assistant" className="relative px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-card/40" />
      <div className="relative mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">AI Assistant</p>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Ask Me Anything</h2>
        <p className="mb-10 max-w-2xl leading-relaxed text-muted-foreground">
          Chat or talk with Momoyo's AI assistant to learn about her background and skills.
        </p>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-foreground/[0.03]">
          <div className="flex border-b border-border">
            <button onClick={() => setTab("chat")} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${tab === "chat" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
            <button onClick={() => setTab("call")} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${tab === "call" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Phone className="h-4 w-4" /> Call
            </button>
          </div>

          {tab === "chat" && (
            <div className="flex flex-col">
              <div ref={scrollRef} className="h-80 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border bg-background/50 px-6 py-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-3">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-xl border border-border bg-card px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                  <button type="submit" disabled={!input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:brightness-110 disabled:opacity-40">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === "call" && (
            <div className="flex flex-col items-center justify-center px-6 py-12 gap-6">
              {isCallActive && messages.length > 1 && (
                <div className="w-full max-h-40 overflow-y-auto rounded-xl border border-border bg-background/50 px-4 py-3">
                  {messages.slice(-6).map(msg => (
                    <div key={msg.id} className={`text-xs mb-1 ${msg.role === "user" ? "text-right text-primary" : "text-left text-muted-foreground"}`}>
                      <span className="font-semibold">{msg.role === "user" ? "You" : "Momoyo"}:</span> {msg.content}
                    </div>
                  ))}
                </div>
              )}

              {isCallActive ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    {(isListening || isSpeaking) && <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />}
                    <div className={`relative flex h-24 w-24 items-center justify-center rounded-full ${isListening ? "bg-red-500/20" : "bg-primary/10"}`}>
                      {isListening ? <Mic className="h-10 w-10 text-red-500" /> : <Phone className="h-10 w-10 text-primary" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{callStatus}</p>
                  <div className="flex gap-4">
                    {!isListening && !isSpeaking && (
                      <button onClick={startListening} className="flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-medium hover:bg-secondary/80">
                        <Mic className="h-4 w-4" /> Speak
                      </button>
                    )}
                    <button onClick={endCall} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white hover:scale-105 transition-transform">
                      <PhoneOff className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <Mic className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">Voice Call</h4>
                    <p className="max-w-xs text-sm text-muted-foreground mt-1">Talk with Momoyo's AI using your browser's built-in voice. Works best in Chrome.</p>
                    {callError && <p className="text-xs text-destructive mt-2">{callError}</p>}
                  </div>
                  <button onClick={startCall} className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110">
                    <Phone className="h-4 w-4" /> Start Call
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
