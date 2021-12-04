// eslint-disable-next-line @next/next/no-server-import-in-page
import { type NextMiddleware, NextResponse } from 'next/server'
import { basename } from 'path'

export const middleware: NextMiddleware = async (req) => {
  const id = basename(req.nextUrl.pathname, '.jpg')
  const res = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

  return res.ok
    ? res
    : NextResponse.rewrite(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
}
