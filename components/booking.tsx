"use client"

import { useState } from "react"
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Check } from "lucide-react"

interface Slot {
  start: string
  end: string
  label: string
  available: boolean
}

export function Booking() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [step, setStep] = useState<"calendar" | "slots" | "form" | "done">("calendar")
  const [form, setForm] = useState({ name: "", email: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const selectDate = async (day: number) => {
    const date = new Date(year, month, day)
    if (date < today) return
    if (date.getDay() === 0 || date.getDay() === 6) return

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
    setLoadingSlots(true)
    setStep("slots")

    try {
      const res = await fetch(`/api/booking/availability?date=${dateStr}`)
      const data = await res.json()
      setSlots(data.slots || [])
    } catch {
      setError("Failed to load available times.")
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedSlot || !form.name || !form.email) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          start: selectedSlot.start,
          end: selectedSlot.end,
        }),
      })
      if (!res.ok) throw new Error("Booking failed")
      setStep("done")
    } catch {
      setError("Failed to create booking. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="booking" className="px-6 py-28">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">Booking</p>
        <h2 className="mb-12 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Schedule a Meeting</h2>

        <div className="rounded-2xl border border-border bg-card shadow-sm shadow-foreground/[0.03] p-8">

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
              <p className="text-muted-foreground">You will receive a calendar invite at {form.email}</p>
              <button
                onClick={() => { setStep("calendar"); setSelectedSlot(null); setForm({ name: "", email: "", message: "" }) }}
                className="mt-4 rounded-full border border-border px-6 py-2 text-sm hover:bg-secondary"
              >
                Book another
              </button>
            </div>
          )}

          {step === "calendar" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-secondary">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-semibold">{monthNames[month]} {year}</h3>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-secondary">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const date = new Date(year, month, day)
                  const isPast = date < today
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const disabled = isPast || isWeekend
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  return (
                    <button
                      key={day}
                      onClick={() => !disabled && selectDate(day)}
                      disabled={disabled}
                      className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                        disabled
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      } ${selectedDate === dateStr ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Available Monday to Friday, 9:00 to 18:00 Sydney time
              </p>
            </div>
          )}

          {step === "slots" && (
            <div>
              <button
                onClick={() => setStep("calendar")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Available times for {selectedDate}
              </h3>
              {loadingSlots ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => { setSelectedSlot(slot); setStep("form") }}
                      disabled={!slot.available}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        slot.available
                          ? "border-border hover:border-primary hover:bg-primary/5"
                          : "border-border/50 text-muted-foreground/40 cursor-not-allowed line-through"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "form" && (
            <div>
              <button
                onClick={() => setStep("slots")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <h3 className="font-semibold mb-1">Confirm booking</h3>
              <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {selectedDate} · {selectedSlot?.label} (Sydney time)
              </p>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Your email *"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                <textarea
                  placeholder="Message (optional)"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.email || submitting}
                  className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-40"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
