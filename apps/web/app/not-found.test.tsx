import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SearchModalProvider,
  useSearchModal,
} from "./_components/search-modal-context";
import NotFound from "./not-found";

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/missing-page",
}));

function SearchModalState() {
  const { isOpen } = useSearchModal();

  return <output>{isOpen ? "open" : "closed"}</output>;
}

function renderNotFound() {
  return render(
    <SearchModalProvider>
      <NotFound />
      <SearchModalState />
    </SearchModalProvider>
  );
}

describe(NotFound, () => {
  it("should render the heading in Japanese", () => {
    renderNotFound();

    expect(
      screen.getByRole("heading", { level: 1, name: "ページが見つかりません" })
    ).toBeInTheDocument();
  });

  it("should render links to the top page and the video list", () => {
    renderNotFound();

    expect(
      screen.getByRole("link", { name: "トップページへ" })
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "動画一覧を見る" })
    ).toHaveAttribute("href", "/videos");
  });

  it("should open the search modal when the search button is clicked", () => {
    renderNotFound();

    expect(screen.getByRole("status")).toHaveTextContent("closed");

    fireEvent.click(screen.getByRole("button", { name: "検索する" }));

    expect(screen.getByRole("status")).toHaveTextContent("open");
  });
});
