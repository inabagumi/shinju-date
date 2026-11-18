import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe(EmptyState, () => {
  it("renders only the title by default", () => {
    const { container } = render(<EmptyState title="データがありません" />);

    expect(screen.getByText("データがありません")).toBeInTheDocument();
    expect(container.firstElementChild?.childElementCount).toBe(1);
  });

  it("renders the icon, description and action when given", () => {
    render(
      <EmptyState
        action={<button type="button">追加</button>}
        description="条件を変えてください。"
        icon={<svg data-testid="icon" />}
        title="動画がありません"
      />
    );

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(screen.getByText("条件を変えてください。")).toHaveClass(
      "text-muted"
    );
    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
  });

  it("does not fill a large area", () => {
    const { container } = render(<EmptyState title="データがありません" />);

    expect(container.firstElementChild?.className).not.toMatch(
      /\b(?:h|min-h)-/u
    );
  });
});
