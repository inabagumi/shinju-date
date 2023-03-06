import { notFound } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

// export const runtime = 'edge'

function getValue(key: string, formData: FormData): Promise<string | null> {
  const value = formData.get(key)

  if (value instanceof Blob) {
    if (value.type.startsWith('text/')) {
      return value.text()
    } else {
      return Promise.resolve(null)
    }
  } else {
    return Promise.resolve(value)
  }
}

type Params = {
  provider: 'email'
}

type Props = {
  params: Params
}

export async function POST(
  request: NextRequest,
  { params }: Props
): Promise<NextResponse> {
  if (params.provider !== 'email') {
    notFound()
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createSupabaseClient(request, response)

  const formData = await request.formData()
  const email = await getValue('email', formData)
  const password = await getValue('password', formData)

  const { error } = await supabase.auth.signInWithPassword({
    email: email ?? '',
    password: password ?? ''
  })

  if (error) {
    const newURL = new URL('/login', request.url)

    newURL.searchParams.set('message', 'ログインに失敗しました')

    if (email) {
      newURL.searchParams.set('email', email)
    }

    const res = await fetch(newURL)

    return new NextResponse(res.body)
  }

  return response
}
