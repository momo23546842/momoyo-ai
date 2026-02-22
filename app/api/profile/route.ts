import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const profile = await prisma.profile.findFirst()
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}