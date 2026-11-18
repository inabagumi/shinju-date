import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import PageMain from "./page-main";
import { MAIN_CONTENT_ID } from "./skip-link";

describe("PageMain", () => {
  test("should render the main landmark the skip link moves to", () => {
    render(<PageMain>content</PageMain>);

    const main = screen.getByRole("main");

    expect(main).toHaveAttribute("id", MAIN_CONTENT_ID);
    expect(main).toHaveTextContent("content");
    expect(main).toHaveClass("mx-auto", "max-w-6xl", "px-4", "py-8");
  });

  test("should add the classes of the page to its own", () => {
    render(<PageMain className="space-y-12 px-8">content</PageMain>);

    const main = screen.getByRole("main");

    expect(main).toHaveClass("max-w-6xl", "space-y-12", "px-8");
    expect(main).not.toHaveClass("px-4");
  });
});
