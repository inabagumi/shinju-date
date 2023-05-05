import { NextResponse } from 'next/server'
import { redisClient } from '@/lib/redis'

export const runtime = 'edge'
export const revalidate = 0

export async function GET(): Promise<NextResponse> {
  const queries = await redisClient.srandmember<string[]>(
    'recommendation_queries',
    4
  )

  return NextResponse.json(queries)
}
