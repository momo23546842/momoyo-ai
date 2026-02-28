"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Phone, PhoneOff, MessageCircle, CalendarDays, Clock, Check, Loader2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  type?: "text" | "slots" | "booking-form" | "booking-confirmed"
  meta?: any
}

interface Slot {
  start: string
  end: string
  label: string
  available: boolean
}

export function AiAssistant() {
  const [tab, setTab] = useState<"chat" | "call">("chat")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm Momoyo's AI assistant. Feel free to ask me anything about her background, skills, or how to get in touch. You can also book a meeting directly in this chat — just say something like \"I want to book a meeting on March 10\"!",
    },
  ])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [callStatus, setCallStatus] = useState("Click Start Call to begin")
  const [callError, setCallError] = useState<string | null>(null)
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", message: "" })
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null)
  const [bookingDate, setBookingDate] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)
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

  // Parse date from user message
  const parseDate = (text: string): string | null => {
    // Match patterns like "March 10", "3/10", "2026-03-10", "10th of March", etc.
    const now = new Date()
    const year = now.getFullYear()

    // ISO format: 2026-03-10
    const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) return isoMatch[0]

    // Slash format: 3/10 or 03/10
    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})/)
    if (slashMatch) {
      const m = slashMatch[1].padStart(2, '0')
      const d = slashMatch[2].padStart(2, '0')
      return `${year}-${m}-${d}`
    }

    // Month name: March 10, April 3rd, 10th of March, etc.
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    }

    const lower = text.toLowerCase()
    for (const [name, num] of Object.entries(months)) {
      // "March 10" or "March 10th"
      const pattern1 = new RegExp(`${name}\\s+(\\d{1,2})`)
      const m1 = lower.match(pattern1)
      if (m1) return `${year}-${num}-${m1[1].padStart(2, '0')}`

      // "10th of March" or "10 March"
      const pattern2 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${name}`)
      const m2 = lower.match(pattern2)
      if (m2) return `${year}-${num}-${m2[1].padStart(2, '0')}`
    }

    // "tomorrow"
    if (lower.includes('tomorrow')) {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // "next Monday", "next Tuesday", etc.
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const d = new Date(now)
        const diff = (i - d.getDay() + 7) % 7 || 7
        d.setDate(d.getDate() + diff)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
    }

    return null
  }

  const isBookingIntent = (text: string): boolean => {
    const lower = text.toLowerCase()
    const keywords = ['book', 'schedule', 'meeting', 'appointment', 'reserve', '予約', 'ミーティング']
    return keywords.some(k => lower.includes(k))
  }

  const fetchSlots = async (date: string): Promise<Slot[]> => {
    try {
      const res = await fetch(`/api/booking/availability?date=${date}`)
      const data = await res.json()
      return (data.slots || []).filter((s: Slot) => s.available)
    } catch {
      return []
    }
  }

  const handleSlotSelect = (slot: Slot, date: string) => {
    setBookingSlot(slot)
    setBookingDate(date)
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: slot.label,
      },
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Great choice! ${date} at ${slot.label} (Sydney time). Please enter your details below to confirm.`,
        type: "booking-form",
        meta: { slot, date },
      },
    ])
  }

  const handleBookingSubmit = async () => {
    if (!bookingSlot || !bookingDate || !bookingForm.name || !bookingForm.email) return
    setIsBooking(true)

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bookingForm.name,
          email: bookingForm.email,
          message: bookingForm.message,
          start: bookingSlot.start,
          end: bookingSlot.end,
        }),
      })

      if (!res.ok) throw new Error('Booking failed')

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Booking confirmed! ✓ ${bookingDate} at ${bookingSlot.label} (Sydney time). The event has been added to Momoyo's calendar. Is there anything else I can help with?`,
          type: "booking-confirmed",
        },
      ])
      setBookingSlot(null)
      setBookingDate(null)
      setBookingForm({ name: "", email: "", message: "" })
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, the booking failed. Please try again or use the booking calendar below.",
        },
      ])
    } finally {
      setIsBooking(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input.trim()
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages(prev => [...prev, userMessage])
    setInput("")

    // Check if this is a booking request with a date
    if (isBookingIntent(text)) {
      const date = parseDate(text)

      if (date) {
        // Add loading message
        const loadingId = (Date.now() + 1).toString()
        setMessages(prev => [...prev, {
          id: loadingId,
          role: "assistant",
          content: `Checking availability for ${date}...`,
        }])

        const slots = await fetchSlots(date)

        // Replace loading message with slots
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== loadingId)
          if (slots.length === 0) {
            return [...filtered, {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: `Sorry, there are no available time slots for ${date}. This might be a weekend or all slots are taken. Please try another date!`,
            }]
          }
          return [...filtered, {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `Here are the available times for ${date} (Sydney time). Pick one:`,
            type: "slots",
            meta: { slots, date },
          }]
        })
        return
      } else {
        // Booking intent but no date
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'd love to help you book a meeting! What date works for you? You can say something like \"March 10\" or \"next Tuesday\". Available: Monday to Friday, 9:00-18:00 Sydney time.",
        }])
        return
      }
    }

    // Check if user is providing a date after being asked
    const date = parseDate(text)
    const lastMsg = messages[messages.length - 1]
    if (date && lastMsg?.role === "assistant" && (lastMsg.content.includes("What date") || lastMsg.content.includes("another date"))) {
      const loadingId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: loadingId,
        role: "assistant",
        content: `Checking availability for ${date}...`,
      }])

      const slots = await fetchSlots(date)

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId)
        if (slots.length === 0) {
          return [...filtered, {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `Sorry, no available slots for ${date}. Please try another date!`,
          }]
        }
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `Here are the available times for ${date} (Sydney time). Pick one:`,
          type: "slots",
          meta: { slots, date },
        }]
      })
      return
    }

    // Regular chat - send to AI
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I couldn't reach the assistant right now." }])
    }
  }

  // Render different message types
  const renderMessage = (msg: Message) => {
    if (msg.type === "slots" && msg.meta?.slots) {
      return (
        <div>
          <p className="mb-3">{msg.content}</p>
          <div className="grid grid-cols-2 gap-2">
            {msg.meta.slots.map((slot: Slot) => (
              <button
                key={slot.start}
                onClick={() => handleSlotSelect(slot, msg.meta.date)}
                className="rounded-lg border border-border/60 px-3 py-2 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/10"
              >
                <Clock className="mr-1 inline h-3 w-3" />
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (msg.type === "booking-form") {
      return (
        <div>
          <p className="mb-3">{msg.content}</p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Your name *"
              value={bookingForm.name}
              onChange={(e) => setBookingForm(f => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
            <input
              type="email"
              placeholder="Your email *"
              value={bookingForm.email}
              onChange={(e) => setBookingForm(f => ({ ...f, email: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Message (optional)"
              value={bookingForm.message}
              onChange={(e) => setBookingForm(f => ({ ...f, message: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleBookingSubmit}
              disabled={!bookingForm.name || !bookingForm.email || isBooking}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-md hover:brightness-110 disabled:opacity-40"
            >
              {isBooking ? <><Loader2 className="h-3 w-3 animate-spin" /> Booking...</> : <><Check className="h-3 w-3" /> Confirm Booking</>}
            </button>
          </div>
        </div>
      )
    }

    if (msg.type === "booking-confirmed") {
      return (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-3 w-3 text-green-600" />
          </div>
          <span>{msg.content}</span>
        </div>
      )
    }

    // Regular text or [BOOKING_LINK]
    if (msg.content.includes("[BOOKING_LINK]")) {
      const parts = msg.content.split("[BOOKING_LINK]")
      return (
        <>
          <span>{parts[0]}</span>
          <button
            onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-md hover:brightness-110"
          >
            <CalendarDays className="h-3 w-3" /> Open Booking Calendar
          </button>
          {parts[1] && <span>{parts[1]}</span>}
        </>
      )
    }

    return <span>{msg.content}</span>
  }

  const speak = (text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/\[BOOKING_LINK\]/g, ". You can find the booking calendar on this page.")
    const utterance = new SpeechSynthesisUtterance(cleanText)
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
      setCallStatus(`You: \"${transcript}\"`)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: transcript }])

      // Check for booking intent in voice
      if (isBookingIntent(transcript)) {
        const date = parseDate(transcript)
        if (date) {
          setCallStatus("Checking availability...")
          const slots = await fetchSlots(date)
          if (slots.length > 0) {
            const slotList = slots.slice(0, 5).map(s => s.label).join(", ")
            const reply = `I found available times for ${date}: ${slotList}. Please use the chat tab to select a time and complete your booking.`
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }])
            speak(reply, () => {
              setTab("chat")
              // Show slots in chat
              setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: `Available times for ${date} (Sydney time):`,
                type: "slots",
                meta: { slots, date },
              }])
              if (isCallActiveRef.current) {
                setCallStatus("Switched to chat for booking")
              }
            })
          } else {
            const reply = `Sorry, no available times for ${date}. Try another date!`
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }])
            speak(reply, () => {
              if (isCallActiveRef.current) { setCallStatus("Your turn \u2014 speak now"); startListening() }
            })
          }
          return
        } else {
          const reply = "I'd love to help you book! What date works for you?"
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }])
          speak(reply, () => {
            if (isCallActiveRef.current) { setCallStatus("Your turn \u2014 speak now"); startListening() }
          })
          return
        }
      }

      // Regular voice chat
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
          if (isCallActiveRef.current) { setCallStatus("Your turn \u2014 speak now"); startListening() }
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
    speak("Hello! I'm Momoyo's AI assistant. What would you like to know? You can also book a meeting by telling me a date!", () => {
      setCallStatus("Your turn \u2014 speak now")
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

  return (
    <section id="assistant" className="relative px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-card/40" />
      <div className="relative mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">AI Assistant</p>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Ask Me Anything</h2>
        <p className="mb-10 max-w-2xl leading-relaxed text-muted-foreground">
          Chat or talk with Momoyo's AI assistant to learn about her, or book a meeting directly.
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
              <div ref={scrollRef} className="h-96 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {msg.role === "assistant" ? renderMessage(msg) : msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border bg-background/50 px-6 py-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-3">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Try: 'Book a meeting on March 10'" className="flex-1 rounded-xl border border-border bg-card px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
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
                      <span className="font-semibold">{msg.role === "user" ? "You" : "Momoyo"}:</span> {msg.content.replace(/\[BOOKING_LINK\]/g, "")}
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
                    <p className="max-w-xs text-sm text-muted-foreground mt-1">Talk with Momoyo's AI. You can also book a meeting by saying a date! Works best in Chrome.</p>
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
