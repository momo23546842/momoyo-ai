import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const career = await prisma.resume.findMany({
      orderBy: { startDate: 'desc' }
    })
    return NextResponse.json(career)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch career' },
      { status: 500 }
    )
  }
}