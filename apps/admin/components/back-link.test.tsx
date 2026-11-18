import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BackLink } from "./back-link";

describe("BackLink", () => {
  it("links back to the list with a focus ring", () => {
    render(<BackLink href="/talents">タレント一覧に戻る</BackLink>);

    const link = screen.getByRole("link", { name: "タレント一覧に戻る" });

    expect(link).toHaveAttribute("href", "/talents");
    expect(link).toHaveClass("focus-ring");
  });
});
