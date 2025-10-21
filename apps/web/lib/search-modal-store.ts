import { create } from 'zustand'

interface SearchModalState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useSearchModal = create<SearchModalState>((set) => ({
  close: () => set({ isOpen: false }),
  isOpen: false,
  open: () => set({ isOpen: true }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
