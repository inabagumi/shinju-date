import dedent from 'dedent'
import { description, title as siteName } from '@/lib/constants'

export function GET(): Response {
  const baseURL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000'
  const body = dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
      <Description>${description}</Description>
      <Image height="16" type="image/x-icon" width="16">${new URL(
        '/favicon.ico',
        baseURL,
      ).toString()}</Image>
      <InputEncoding>UTF-8</InputEncoding>
      <moz:SearchForm>${new URL('/', baseURL).toString()}</moz:SearchForm>
      <ShortName>${siteName}</ShortName>
      <Url method="get" template="${baseURL}/videos/{searchTerms}" type="text/html"/>
    </OpenSearchDescription>
  `

  return new Response(body, {
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=UTF-8',
    },
  })
}
