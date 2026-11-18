import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Breadcrumbs from "./breadcrumbs";

describe("Breadcrumbs", () => {
  it("should link the site name to the top page", () => {
    render(<Breadcrumbs items={[{ name: "利用規約" }]} />);

    expect(screen.getByRole("link", { name: "SHINJU DATE" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("should render the last item as the current page without a link", () => {
    render(<Breadcrumbs items={[{ name: "利用規約" }]} />);

    expect(
      screen.getByText("利用規約").closest("[aria-current]")
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("link", { name: "利用規約" })
    ).not.toBeInTheDocument();
  });

  it("should link intermediate items", () => {
    render(
      <Breadcrumbs
        items={[
          { href: "/videos", name: "動画一覧" },
          { name: "『歌』の検索結果" },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "動画一覧" })).toHaveAttribute(
      "href",
      "/videos"
    );
    expect(
      screen.queryByRole("link", { name: "『歌』の検索結果" })
    ).not.toBeInTheDocument();
  });
});
