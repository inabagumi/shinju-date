import type * as z from 'zod'
import type { searchParamsSchema } from '../_lib/search-params-schema'
import { Input } from './input'

export function InputSkeleton() {
  return <Input disabled />
}

export async function AsyncInput({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<z.Infer<typeof searchParamsSchema>>
}) {
  const searchParams = await searchParamsPromise

  return <Input searchParams={searchParams} />
}
