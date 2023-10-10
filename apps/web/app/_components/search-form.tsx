import { track } from '@vercel/analytics/server'
import clsx from 'clsx'
import { redirect } from 'next/navigation'
import styles from './search-form.module.css'

async function search(formData: FormData) {
  'use server'

  const queries = formData.getAll('q')
  const query = queries.join(' ')

  await track('Search', { query })

  redirect(`/videos/${encodeURIComponent(query)}`)
}

export default function SearchForm() {
  return (
    <search className={styles.search}>
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        action={search}
        className="navbar__search"
      >
        <input
          aria-label="検索"
          className={clsx('navbar__search-input', styles.input)}
          name="q"
          placeholder="検索"
          type="search"
        />
      </form>
    </search>
  )
}
