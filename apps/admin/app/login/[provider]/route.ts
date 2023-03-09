import { verifyOrigin } from '@shinju-date/helpers'
import { notFound } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { LOGIN_FAILED_MESSAGE } from '@/app/login/constants'
import { getRedirectTo } from '@/app/login/page'
import loginFormDataSchema, { type LoginFormData } from '@/app/login/schema'
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

type CreateErrorResponseOptions = {
  defaultValues: Partial<Omit<LoginFormData, 'password'>>
  message?: string
  redirectTo?: string
}

async function createErrorResponse(
  request: NextRequest,
  { defaultValues, message, redirectTo }: CreateErrorResponseOptions
): Promise<Response> {
  const newURL = new URL('/login', request.url)

  if (message) {
    newURL.searchParams.set('message', message)
  }

  if (redirectTo) {
    newURL.searchParams.set('return', redirectTo)
  }

  if (defaultValues) {
    for (const [key, value] of Object.entries(defaultValues)) {
      if (value) {
        newURL.searchParams.set(key, value)
      }
    }
  }

  return fetch(newURL)
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
): Promise<NextResponse | Response> {
  if (params.provider !== 'email') {
    notFound()
  }

  if (!verifyOrigin(request)) {
    return new NextResponse('422 Unprocessable Entity', {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 422
    })
  }

  const returnTo = request.nextUrl.searchParams.get('return')
  const redirectTo = getRedirectTo(returnTo ?? '/')

  const formData = await request.formData()
  const [email, password] = await Promise.all([
    getValue('email', formData),
    getValue('password', formData)
  ])

  let loginFormData: LoginFormData
  try {
    loginFormData = await loginFormDataSchema.validate(
      { email, password },
      { strict: true }
    )
  } catch (error) {
    return createErrorResponse(request, {
      defaultValues: {
        email: email ?? ''
      },
      message: LOGIN_FAILED_MESSAGE
    })
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createSupabaseClient(request, response)

  const { error } = await supabase.auth.signInWithPassword({
    email: loginFormData.email,
    password: loginFormData.password
  })

  if (error) {
    return createErrorResponse(request, {
      defaultValues: {
        email: loginFormData.email
      },
      message: LOGIN_FAILED_MESSAGE
    })
  }

  return response
}
