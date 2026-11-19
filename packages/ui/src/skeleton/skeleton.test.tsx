import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe(Skeleton, () => {
  it("should render a pulsing block hidden from assistive technology", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const skeleton = container.firstElementChild;

    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass(
      "block",
      "animate-pulse",
      "rounded-control",
      "bg-muted",
      "h-4",
      "w-32"
    );
  });

  it("should let className override the radius and the color", () => {
    const { container } = render(
      <Skeleton className="rounded-container bg-border" />
    );
    const skeleton = container.firstElementChild;

    expect(skeleton).toHaveClass("rounded-container", "bg-border");
    expect(skeleton).not.toHaveClass("rounded-control");
    expect(skeleton).not.toHaveClass("bg-muted");
  });

  it("should let className make it inline", () => {
    const { container } = render(<Skeleton className="inline-block" />);

    expect(container.firstElementChild).toHaveClass("inline-block");
    expect(container.firstElementChild).not.toHaveClass("block");
  });
});
