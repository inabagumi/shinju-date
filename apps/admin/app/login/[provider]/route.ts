import { notFound } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

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

  const nextUrl = request.nextUrl.clone()
  nextUrl.pathname = '/'

  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createSupabaseClient(request, response)

  const formData = await request.formData()
  const email = formData.get('email')
  const password = formData.get('password')

  const { error } = await supabase.auth.signInWithPassword({
    email: typeof email === 'string' ? email : '',
    password: typeof password === 'string' ? password : ''
  })

  if (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
