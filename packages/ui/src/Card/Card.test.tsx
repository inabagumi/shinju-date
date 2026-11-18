import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardHeader } from "./Card";

describe(Card, () => {
  it("renders the header and the content inside the card", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <h2>今週の配信</h2>
        </CardHeader>
        <CardContent data-testid="content">
          <p>12件の配信があります。</p>
        </CardContent>
      </Card>
    );

    const card = screen.getByTestId("card");
    const header = screen.getByTestId("header");
    const content = screen.getByTestId("content");

    expect(Array.from(card.children)).toStrictEqual([header, content]);
    expect(header).toContainElement(
      screen.getByRole("heading", { name: "今週の配信" })
    );
    expect(content).toContainElement(
      screen.getByText("12件の配信があります。")
    );
  });

  it("uses the classes of each part", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header" />
        <CardContent data-testid="content" />
      </Card>
    );

    expect(screen.getByTestId("card")).toHaveClass(
      "flex",
      "flex-col",
      "overflow-hidden",
      "rounded-container",
      "border",
      "border-border",
      "bg-muted",
      "text-foreground"
    );
    expect(screen.getByTestId("header")).toHaveClass("p-6", "pb-0");
    expect(screen.getByTestId("content")).toHaveClass("p-6");
  });

  it.each([
    { kept: ["bg-surface"], overridden: "bg-muted", testId: "card" },
    { kept: ["p-6", "pb-2"], overridden: "pb-0", testId: "header" },
    { kept: ["p-4"], overridden: "p-6", testId: "content" },
  ])(
    "lets className win over the default classes of the $testId",
    ({ kept, overridden, testId }) => {
      render(
        <Card className="bg-surface" data-testid="card">
          <CardHeader className="pb-2" data-testid="header" />
          <CardContent className="p-4" data-testid="content" />
        </Card>
      );

      const element = screen.getByTestId(testId);

      expect(element).toHaveClass(...kept);
      expect(element).not.toHaveClass(overridden);
    }
  );
});
