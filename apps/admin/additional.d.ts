declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test'

    readonly NEXT_PUBLIC_ALGOLIA_APPLICATION_ID: string
    readonly NEXT_PUBLIC_ALGOLIA_API_KEY: string
    readonly NEXT_PUBLIC_ALGOLIA_INDEX_NAME: string
    readonly NEXT_PUBLIC_BASE_URL: string
    readonly NEXT_PUBLIC_GA_TRACKING_ID?: string
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    readonly NEXT_PUBLIC_SUPABASE_URL: string
  }
}
