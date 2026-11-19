import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

describe(Markdown, () => {
  it("opens links in a new tab", () => {
    render(<Markdown>[SHINJU DATE](https://shinju.date/)</Markdown>);

    const link = screen.getByRole("link", { name: "SHINJU DATE" });

    expect(link).toHaveAttribute("href", "https://shinju.date/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "nofollow noopener noreferrer");
  });

  it("renders GitHub Flavored Markdown", () => {
    render(<Markdown>~~old~~</Markdown>);

    expect(screen.getByText("old").tagName).toBe("DEL");
  });

  it("does not render raw HTML", () => {
    const { container } = render(
      <Markdown>{"<script>alert(1)</script>"}</Markdown>
    );

    expect(container.querySelector("script")).toBeNull();
  });

  it("uses the small prose size when size is sm", () => {
    const { container } = render(<Markdown size="sm">本文</Markdown>);

    expect(container.firstChild).toHaveClass("prose", "prose-sm");
  });
});
