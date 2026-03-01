export function About() {
  return (
    <section id="about" className="px-6 py-28">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-primary">
          About
        </p>
        <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Where IT Meets Healthcare
        </h2>

        {/* Venn Diagram */}
        <div className="relative mx-auto" style={{ maxWidth: '720px' }}>

          {/* Desktop: overlapping circles */}
          <div className="hidden md:block">
            <div className="relative" style={{ height: '420px' }}>
              {/* Left circle */}
              <div
                className="absolute rounded-full border border-primary/20 bg-primary/[0.06] dark:bg-primary/[0.08] transition-all duration-300 hover:bg-primary/[0.10] dark:hover:bg-primary/[0.14]"
                style={{ width: '360px', height: '360px', left: '0', top: '30px' }}
              >
                <div className="flex h-full flex-col justify-center pl-12 pr-32">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">IT &amp; Digital Systems</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      Web technologies
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      AI tools
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      Data &amp; automation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      System thinking
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right circle */}
              <div
                className="absolute rounded-full border border-accent/30 bg-accent/[0.06] dark:bg-accent/[0.08] transition-all duration-300 hover:bg-accent/[0.10] dark:hover:bg-accent/[0.14]"
                style={{ width: '360px', height: '360px', right: '0', top: '30px' }}
              >
                <div className="flex h-full flex-col justify-center pl-32 pr-12">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Health &amp; Human Care</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                      Clinical nutrition
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                      Preventive health
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                      Behaviour change
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                      Patient-centered perspective
                    </li>
                  </ul>
                </div>
              </div>

              {/* Center intersection */}
              <div
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ width: '180px' }}
              >
                <div className="rounded-2xl border border-primary/30 bg-card/90 px-5 py-6 text-center shadow-lg shadow-primary/5 backdrop-blur-sm">
                  <h3 className="mb-3 text-base font-bold text-primary">Digital Health</h3>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>Health-focused digital solutions</li>
                    <li>Technology-enabled care</li>
                    <li>Human-centered systems</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-6 md:hidden">
            {/* IT */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">IT &amp; Digital Systems</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  Web technologies
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  AI tools
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  Data &amp; automation
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  System thinking
                </li>
              </ul>
            </div>

            {/* Digital Health - center */}
            <div className="-my-2 z-10 mx-auto w-4/5 rounded-2xl border border-primary/30 bg-card px-6 py-5 text-center shadow-lg shadow-primary/5">
              <h3 className="mb-2 text-base font-bold text-primary">Digital Health</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Health-focused digital solutions</li>
                <li>Technology-enabled care</li>
                <li>Human-centered systems</li>
              </ul>
            </div>

            {/* Health */}
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Health &amp; Human Care</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  Clinical nutrition
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  Preventive health
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  Behaviour change
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  Patient-centered perspective
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
