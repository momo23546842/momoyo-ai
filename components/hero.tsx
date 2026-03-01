"use client"

import { ArrowDown } from "lucide-react"
import Image from "next/image"

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[60vh] items-center justify-center px-6"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col-reverse items-center gap-12 md:flex-row md:gap-16">
        <div className="flex-1 text-center md:text-left">
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
            <span className="text-balance">Momoyo Kataoka</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground md:mx-0">
            Aspiring to design digital experiences that connect health and technology.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
          >
            Talk with me
          </a>
        </div>

        <div className="flex shrink-0 items-center justify-center">
          <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-primary/20 shadow-2xl shadow-primary/10 ring-1 ring-primary/10 ring-offset-4 ring-offset-background md:h-72 md:w-72">
            <Image
              src="/image/profile.jpg"
              alt="Momoyo Kataoka"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <a href="#assistant" aria-label="Scroll to content">
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
        </a>
      </div>
    </section>
  )
}
