"use client";

import { createContext, useContext, useState } from "react";
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

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <SearchModalContext.Provider value={{ closeModal, isOpen, openModal }}>
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
