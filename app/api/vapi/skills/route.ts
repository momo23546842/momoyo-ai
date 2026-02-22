import { NextResponse } from 'next/server'

export async function GET() {
  const { prisma } = await import('@/lib/prisma')
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { category: 'asc' }
    })
    return NextResponse.json({ success: true, data: skills })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}