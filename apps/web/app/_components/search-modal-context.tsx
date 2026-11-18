"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface SearchModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const SearchModalContext = createContext<SearchModalContextType | undefined>(
  undefined
);

export const SearchModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const value = useMemo(
    () => ({ closeModal, isOpen, openModal }),
    [closeModal, isOpen, openModal]
  );

  return (
    <SearchModalContext.Provider value={value}>
      {children}
    </SearchModalContext.Provider>
  );
};

export const useSearchModal = () => {
  const context = useContext(SearchModalContext);
  if (context === undefined) {
    throw new Error("useSearchModal must be used within a SearchModalProvider");
  }
  return context;
};
