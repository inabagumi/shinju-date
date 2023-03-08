/// <reference types="@shinju-date/polyfills" />
/// <reference types="mdx" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test'

    readonly NEXT_PUBLIC_ALGOLIA_APPLICATION_ID: string
    readonly NEXT_PUBLIC_ALGOLIA_API_KEY: string
    readonly NEXT_PUBLIC_ALGOLIA_INDEX_NAME: string
    readonly NEXT_PUBLIC_BASE_URL: string
    readonly NEXT_PUBLIC_DESCRIPTION: string
    readonly NEXT_PUBLIC_GA_TRACKING_ID?: string
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    readonly NEXT_PUBLIC_SUPABASE_URL: string
  }
}

declare module 'next-pwa' {
  import { type NextConfig } from 'next'

  export default function withPWA(config: NextConfig): NextConfig
}

declare module '*.svg' {
  import { type FC, type SVGProps } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: FC<Props>

  export default content
}
