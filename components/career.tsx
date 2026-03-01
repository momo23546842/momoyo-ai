import { Briefcase, GraduationCap } from "lucide-react"

const timeline = [
  {
    title: "LMS Intern",
    org: "ECA College",
    period: "Feb 2026 – Present",
    description:
      "Supporting LMS administration and digital learning systems, ensuring smooth platform operations and user experience.",
    type: "work" as const,
  },
  {
    title: "Full Stack & Agentic AI Industry Project Intern (Team Lead)",
    org: "AusBiz Consulting · 10-week Industry Internship",
    period: "Nov 2025 – Feb 2026",
    description:
      "Led a team in developing AI-driven web applications using modern full-stack technologies, focusing on intelligent systems and practical industry solutions.",
    type: "work" as const,
  },
  {
    title: "Diploma of Information Technology",
    org: "ECA College",
    period: "2025 – Present",
    type: "education" as const,
  },
  {
    title: "Dietitian (Online, Self-employed)",
    org: "",
    period: "2025 – Present",
    description:
      "Providing nutrition consultations and health guidance through digital platforms.",
    type: "work" as const,
  },
  {
    title: "Dietitian",
    org: "Chiba Yakuhin, Japan",
    period: "2022 – 2024",
    type: "work" as const,
  },
  {
    title: "Bachelor's Degree in Nutrition",
    org: "Nagoya University of Arts and Sciences",
    period: "2018 – 2022",
    type: "education" as const,
  },
]

export function Career() {
  return (
    <section id="career" className="relative px-6 py-28 sm:py-32">
      {/* Subtle alternating background */}
      <div className="pointer-events-none absolute inset-0 bg-card/40" />

      <div className="relative mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">
          Career
        </p>
        <h2 className="mb-14 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Experience & Education
        </h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border md:left-1/2 md:-translate-x-px" />

          <div className="flex flex-col gap-12 md:gap-14">
            {timeline.map((item, i) => (
              <div
                key={i}
                className={`relative flex flex-col md:flex-row ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-[12px] top-2 z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-primary bg-background md:left-1/2 md:-translate-x-1/2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>

                {/* Content */}
                <div
                  className={`ml-12 md:ml-0 md:w-1/2 ${
                    i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                  }`}
                >
                  <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm shadow-foreground/[0.03] transition-shadow duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                    {/* Date + icon row */}
                    <div className="mb-2.5 flex items-center gap-2">
                      {i % 2 !== 0 && (
                        <>
                          {item.type === "education" ? (
                            <GraduationCap className="h-4 w-4 shrink-0 text-primary/80" />
                          ) : (
                            <Briefcase className="h-4 w-4 shrink-0 text-primary/80" />
                          )}
                        </>
                      )}
                      <span className="font-mono text-[11px] tracking-wide text-muted-foreground/70">
                        {item.period}
                      </span>
                      {i % 2 === 0 && (
                        <span className="md:ml-auto">
                          {item.type === "education" ? (
                            <GraduationCap className="h-4 w-4 shrink-0 text-primary/80" />
                          ) : (
                            <Briefcase className="h-4 w-4 shrink-0 text-primary/80" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">
                      {item.title}
                    </h3>

                    {/* Organisation */}
                    {item.org && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.org}
                      </p>
                    )}

                    {/* Description */}
                    {item.description && (
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/80">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
