import { NextResponse } from 'next/server'

export async function GET() {
  const { prisma } = await import('@/lib/prisma')
  try {
    const profile = await prisma.profile.findFirst()
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}