'use client'

import { Button, type ButtonProps } from '@shinju-date/ui'
import { Search } from 'lucide-react'
import { useSearchModal } from './search-modal-context'

type OpenSearchModalButtonProps = Omit<ButtonProps, 'onClick' | 'type'>

export function OpenSearchModalButton({
  children = '検索する',
  ...props
}: OpenSearchModalButtonProps) {
  const { openModal } = useSearchModal()

  return (
    <Button onClick={openModal} {...props}>
      <Search aria-hidden="true" className="mr-2 size-5" />
      {children}
    </Button>
  )
}
