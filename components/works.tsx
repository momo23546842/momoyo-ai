import { ExternalLink, Github, MessageCircle, Phone, CalendarDays, Mail, Video } from "lucide-react"

const techStack = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Prisma",
  "Neon (PostgreSQL)",
  "Vercel AI SDK",
  "MCP",
  "Groq",
  "Google Calendar API",
  "Resend",
  "Vercel",
]

const features = [
  { icon: MessageCircle, label: "AI chat (text-based Digital Twin)" },
  { icon: Phone, label: "Voice call with speech recognition" },
  { icon: CalendarDays, label: "Calendar booking integration" },
  { icon: Video, label: "Google Meet auto-generation" },
  { icon: Mail, label: "Resend email automation" },
]

export function Works() {
  return (
    <section id="works" className="relative px-6 py-28">
      {/* Subtle alternating background */}
      <div className="pointer-events-none absolute inset-0 bg-card/40" />

      <div className="relative mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">
          Works
        </p>
        <h2 className="mb-12 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Selected Projects
        </h2>

        {/* Project card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm shadow-foreground/[0.03] transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 sm:p-8">
          {/* Header */}
          <h3 className="mb-3 text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">
            Digital Twin AI Portfolio System
          </h3>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A full-stack AI portfolio that acts as a Digital Twin — visitors can chat or voice-call
            an AI version of me to learn about my background, skills, and experience. Includes
            integrated booking with Google Meet and automated email confirmations.
          </p>

          {/* Features */}
          <div className="mb-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Key Features
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/50 px-3.5 py-2.5"
                >
                  <f.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-xs text-card-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div className="mb-8">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Tech Stack
            </h4>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href="https://momoyo-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Live Demo
            </a>
            <a
              href="https://github.com/momo23546842/momoyo-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
