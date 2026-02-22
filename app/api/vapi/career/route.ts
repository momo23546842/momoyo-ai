import { NextResponse } from 'next/server'

export async function GET() {
  const { prisma } = await import('@/lib/prisma')
  try {
    const career = await prisma.resume.findMany({
      orderBy: { startDate: 'desc' }
    })
    return NextResponse.json({ success: true, data: career })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch career' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}