'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'

interface SearchModalContextType {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const SearchModalContext = createContext<SearchModalContextType | undefined>(
  undefined,
)

export function SearchModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <SearchModalContext.Provider value={{ closeModal, isOpen, openModal }}>
      {children}
    </SearchModalContext.Provider>
  )
}

export function useSearchModal() {
  const context = useContext(SearchModalContext)
  if (context === undefined) {
    throw new Error('useSearchModal must be used within a SearchModalProvider')
  }
  return context
}
