import { supabaseClient } from '../../../lib/supabase'

export const runtime = 'edge'

export async function GET(): Promise<Response> {
  try {
    // Test database connectivity by making a simple query
    const { error } = await supabaseClient
      .from('channels')
      .select('id')
      .limit(1)

    if (error) {
      return new Response(
        JSON.stringify({
          details: error.message,
          message: 'Database connection failed',
          status: 'error',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 503,
        },
      )
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Health check failed',
        status: 'error',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 503,
      },
    )
  }
}
