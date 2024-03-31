import { revalidateTag } from 'next/cache'

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData()
  const tags = formData
    .getAll('tag')
    .filter((tag): tag is string => !(tag instanceof Blob))

  for (const tag of tags) {
    revalidateTag(tag)
  }

  return new Response(null, { status: 204 })
}
