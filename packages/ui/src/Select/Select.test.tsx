import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "../Input/Input";
import { Select } from "./Select";

describe(Select, () => {
  it("lets the user choose an option", async () => {
    const user = userEvent.setup();

    render(
      <Select aria-label="並び順" defaultValue="new">
        <option value="new">新しい順</option>
        <option value="old">古い順</option>
      </Select>
    );

    const select = screen.getByRole("combobox", { name: "並び順" });

    await user.selectOptions(select, "old");

    expect(select).toHaveValue("old");
  });

  it("shares the border, radius and padding of Input", () => {
    render(
      <>
        <Input aria-label="キーワード" variant="danger" />
        <Select aria-label="並び順" variant="danger" />
      </>
    );

    const input = screen.getByRole("textbox");
    const select = screen.getByRole("combobox");

    expect(select).toHaveClass(
      ...input.className.split(" ").filter((className) => className !== "px-4")
    );

    expect(select).toHaveClass("appearance-none", "pr-10");
  });

  it("draws the arrow with the muted text color", () => {
    const { container } = render(<Select aria-label="並び順" />);

    const arrow = container.querySelector("svg");

    expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(arrow).toHaveClass("text-muted");
  });

  it("applies className to the container for layout", () => {
    render(<Select aria-label="並び順" className="md:w-48" required />);

    const select = screen.getByRole("combobox");

    expect(select.parentElement).toHaveClass("md:w-48");
    expect(select).not.toHaveClass("md:w-48");
    expect(select).toBeRequired();
  });
});
