export const runtime = 'edge'

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: {
      'Content-Type': 'application/json',
    },
    status: 200,
  })
}
