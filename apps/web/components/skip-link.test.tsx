import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SimpleDocument from "./simple-document";
import SkipLink, { MAIN_CONTENT_ID } from "./skip-link";

describe(SkipLink, () => {
  it("should link to the main content", () => {
    render(<SkipLink />);

    expect(
      screen.getByRole("link", { name: "本文へスキップ" })
    ).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
  });

  it("should point to the main landmark including the page heading", () => {
    render(
      <>
        <SkipLink />
        <SimpleDocument title="利用規約">
          <p>本文</p>
        </SimpleDocument>
      </>
    );

    const main = screen.getByRole("main");

    expect(main).toHaveAttribute("id", MAIN_CONTENT_ID);
    expect(main).toContainElement(
      screen.getByRole("heading", { level: 1, name: "利用規約" })
    );
  });
});
