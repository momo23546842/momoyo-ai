/**
 * prisma/seed.ts
 *
 * Backfill script for the Digital Twin interview page.
 * Safe to run multiple times — uses upserts / connectOrCreate.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter } as any)

// ── Helper: get-or-create a TechStack row by name ────────────
async function tech(name: string) {
  return prisma.techStack.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

async function main() {
  console.log("🌱  Seeding Digital Twin data …")

  // ─── 1. Profile update (backfill nullable columns) ──────────
  // Update the first profile row (there should be exactly one)
  const existingProfile = await prisma.profile.findFirst()
  if (existingProfile) {
    await prisma.profile.update({
      where: { id: existingProfile.id },
      data: {
        summary:
          "IT student based in Sydney with hands-on full-stack AI development internship experience, " +
          "and a Japan-licensed Registered Dietitian. Currently working under contract with Japanese companies, " +
          "providing Specific Health Guidance (Tokutei Hoken Shidou) to 60\u201380 clients per month.",
        focus:
          "Health-Tech \u00b7 AI-Assisted Development \u00b7 Digital Health Solutions \u00b7 LMS Administration",
        vision:
          "To leverage my Japan-licensed dietitian background and IT skills to contribute to health-tech roles \u2014 " +
          "building data-driven, scalable digital health solutions that bridge clinical expertise and modern technology.",
      },
    })
    console.log("  ✔ Profile updated")
  } else {
    console.log("  ⚠ No existing Profile row found — skipping profile backfill")
  }

  // ─── 2. Tech stacks ─────────────────────────────────────────
  const ts = {
    nextjs:     await tech("Next.js"),
    typescript: await tech("TypeScript"),
    vercel:     await tech("Vercel"),
    neon:       await tech("Neon (PostgreSQL)"),
    prisma:     await tech("Prisma"),
    vercelAI:   await tech("Vercel AI SDK"),
    mcp:        await tech("MCP (Model Context Protocol)"),
    v0:         await tech("v0"),
    ngrok:      await tech("ngrok"),
    github:     await tech("GitHub"),
    clickup:    await tech("ClickUp"),
    tailwind:   await tech("Tailwind CSS"),
    react:      await tech("React"),
    lms:        await tech("LMS Administration"),
    canva:      await tech("Canva"),
  }
  console.log("  ✔ TechStack rows upserted")

  // ─── 3. Experiences ──────────────────────────────────────────

  // 3a – AI Full-Stack Internship
  const aiInternship = await prisma.experience.create({
    data: {
      type: "INTERNSHIP",
      category: "IT",
      title: "Full Stack & Agentic AI Industry Project Intern (Team Lead)",
      org: "AusBiz Consulting",
      startDate: new Date("2025-11-01"),
      endDate: new Date("2026-02-01"),
      description:
        "Led a team in developing AI-driven web applications during a 10-week industry internship, " +
        "using modern full-stack technologies with a focus on intelligent systems and practical solutions.",
      highlights: [
        "Built a Digital Twin portfolio with AI chat & voice interview capabilities",
        "Implemented MCP server for structured tool-use across LLM providers",
        "Managed team delivery using ClickUp sprints and GitHub PRs",
        "Deployed on Vercel with Neon PostgreSQL and Prisma ORM",
      ],
      sortOrder: 1,
      techStack: {
        create: [
          { techId: ts.nextjs.id },
          { techId: ts.typescript.id },
          { techId: ts.vercel.id },
          { techId: ts.neon.id },
          { techId: ts.prisma.id },
          { techId: ts.vercelAI.id },
          { techId: ts.mcp.id },
          { techId: ts.v0.id },
          { techId: ts.ngrok.id },
          { techId: ts.github.id },
          { techId: ts.clickup.id },
          { techId: ts.tailwind.id },
          { techId: ts.react.id },
        ],
      },
    },
  })
  console.log(`  ✔ Experience created: ${aiInternship.title}`)

  // 3b – LMS Internship
  const lmsInternship = await prisma.experience.create({
    data: {
      type: "INTERNSHIP",
      category: "EDU",
      title: "LMS Intern",
      org: "ECA College",
      startDate: new Date("2026-02-01"),
      endDate: null,
      description:
        "Supporting LMS administration and digital learning systems — ensuring smooth platform " +
        "operations, course page design/configuration, and content management.",
      highlights: [
        "Administering and maintaining the college LMS platform",
        "Designing and configuring course pages for optimal learner experience",
        "Managing digital content uploads and organisation",
      ],
      sortOrder: 0,
      techStack: {
        create: [
          { techId: ts.lms.id },
          { techId: ts.canva.id },
        ],
      },
    },
  })
  console.log(`  ✔ Experience created: ${lmsInternship.title}`)

  // 3c – Registered Dietitian (contract)
  const dietitian = await prisma.experience.create({
    data: {
      type: "CONTRACT",
      category: "NUTRITION",
      title: "Registered Dietitian",
      org: "Chiba Yakuhin, Japan",
      startDate: new Date("2022-04-01"),
      endDate: new Date("2024-12-01"),
      description:
        "Provided Tokutei Hoken Shidou (specific health guidance) consultations, " +
        "serving 60–80 clients per month. Primarily Japanese-speaking clients with occasional English support.",
      highlights: [
        "Managed 60–80 nutrition consultations per month",
        "Specialised in metabolic syndrome prevention guidance",
        "Handled bilingual (JP/EN) client communications",
      ],
      sortOrder: 2,
    },
  })
  console.log(`  ✔ Experience created: ${dietitian.title}`)

  console.log("\n✅  Seed complete.")
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
