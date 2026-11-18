import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FilterBar } from "./filter-bar";

describe(FilterBar, () => {
  it("toggles the filters with the button", async () => {
    const user = userEvent.setup();

    render(
      <FilterBar>
        <input aria-label="キーワード" />
      </FilterBar>
    );

    const trigger = screen.getByRole("button", { name: "絞り込み" });
    const content = screen.getByRole("textbox").parentElement;

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", content?.id);

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "絞り込み" })).toHaveAttribute(
      "data-state",
      "open"
    );
  });

  it("keeps the filters rendered while closed", () => {
    render(
      <FilterBar>
        <input aria-label="キーワード" />
      </FilterBar>
    );

    expect(
      screen.getByRole("textbox", { name: "キーワード" })
    ).toBeInTheDocument();
  });

  it("shows the number of active filters", () => {
    render(
      <FilterBar activeCount={2} label="動画の絞り込み">
        <input aria-label="キーワード" />
      </FilterBar>
    );

    expect(
      screen.getByRole("button", { name: /動画の絞り込み\s*2件適用中/u })
    ).toBeInTheDocument();
  });

  it("hides the count without active filters", () => {
    render(
      <FilterBar>
        <input aria-label="キーワード" />
      </FilterBar>
    );

    expect(screen.queryByText("件適用中")).not.toBeInTheDocument();
  });
});
