import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { PrismaNeon } from '@prisma/adapter-neon'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: `${process.env.DATABASE_URL}` })
const prisma = new PrismaClient({ log: ['warn', 'error'], adapter })

async function main() {
  // ensure the client is connected (helps with some runtime environments)
  await prisma.$connect()
  // Profile
  await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Momoyo Kataoka',
      bio: 'IT student currently completing a Diploma of IT. Coursework includes networking, web page development, data management, and project management. Through a team-based internship, gained hands-on experience across the full software development lifecycle. Currently serves as a team lead, responsible for task allocation and schedule management. Interested in system development and roles related to system operation and maintenance.',
      catchphrase: 'Full-Stack Developer & Dietitian based in Sydney',
    },
  })

  // Resume - IT Experience
  await prisma.resume.createMany({
    data: [
      {
        type: 'work',
        title: 'Full-Stack AI System Development / Team Lead',
        organization: 'AusBiz Consulting / Employability Advantage Bootcamp',
        startDate: new Date('2025-01-01'),
        endDate: null,
        description: 'Participating in a structured, team-based internship focused on production-style full-stack AI system development. Working with Next.js and TypeScript. Deployed web applications using Vercel. Utilised Neon (PostgreSQL) for cloud-based database. Involved in Digital Twin system development. Currently serving as Team Lead responsible for task allocation and schedule management.',
      },
      {
        type: 'work',
        title: 'Dietitian (Online)',
        organization: 'Self-employed, Japan',
        startDate: new Date('2025-08-01'),
        endDate: null,
        description: 'Providing online nutrition consultations in a remote working environment. Managing schedules independently. Supporting clients primarily in Japanese, with experience delivering services in English.',
      },
      {
        type: 'work',
        title: 'Dietitian',
        organization: 'Chiba Yakuhin, Chiba, Japan',
        startDate: new Date('2022-04-01'),
        endDate: new Date('2024-04-01'),
        description: 'Provided nutrition consultations and health guidance for clients. Delivered health education programs in collaboration with local municipalities.',
      },
      {
        type: 'work',
        title: 'Kitchen Staff',
        organization: 'Ume Burger, Sydney',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-12-01'),
        description: 'Primarily responsible for kitchen operations in a fast-paced environment, while also supporting front-of-house duties as needed. Followed food safety standards and worked effectively as part of a team.',
      },
      {
        type: 'education',
        title: 'Diploma of IT',
        organization: 'ECA College',
        startDate: new Date('2025-01-01'),
        endDate: null,
        description: 'Coursework includes networking, web page development, data management, and project management.',
      },
      {
        type: 'education',
        title: "Bachelor's Degree in Nutrition",
        organization: 'Nagoya University of Arts and Sciences',
        startDate: new Date('2018-04-01'),
        endDate: new Date('2022-03-31'),
        description: 'Studied nutrition science and health guidance.',
      },
    ],
  })

  // Skills - Technical
  await prisma.skill.createMany({
    data: [
      { name: 'Next.js', category: 'Web Development', level: 4 },
      { name: 'TypeScript', category: 'Web Development', level: 3 },
      { name: 'Vercel', category: 'Cloud & Infrastructure', level: 4 },
      { name: 'Neon (PostgreSQL)', category: 'Cloud & Infrastructure', level: 3 },
      { name: 'Digital Twin Systems', category: 'AI Systems', level: 3 },
      { name: 'AI-driven Web Applications', category: 'AI Systems', level: 3 },
      { name: 'GitHub', category: 'Tools', level: 4 },
      { name: 'ClickUp', category: 'Tools', level: 4 },
      { name: 'Team Leadership', category: 'Professional Skills', level: 4 },
      { name: 'Schedule Management', category: 'Professional Skills', level: 4 },
      { name: 'Documentation', category: 'Professional Skills', level: 4 },
    ],
  })

  console.log('✅ Seed data inserted!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })