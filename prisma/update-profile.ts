/**
 * One-off script to update Profile.summary/focus/vision in the live database.
 * Usage: npx tsx prisma/update-profile.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const existing = await prisma.profile.findFirst()
  if (!existing) {
    console.log("No profile row found — nothing to update.")
    return
  }

  await prisma.profile.update({
    where: { id: existing.id },
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

  console.log("\u2705 Profile updated with corrected summary / focus / vision.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
