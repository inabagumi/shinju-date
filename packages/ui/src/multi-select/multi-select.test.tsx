import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MultiSelect } from "./multi-select";
import type { MultiSelectProps } from "./multi-select";

describe(MultiSelect, () => {
  const defaultOptions = [
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
    { label: "Option 3", value: "3" },
  ];

  it("should render with placeholder when no values selected", () => {
    render(
      <MultiSelect
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("Select items");
  });

  it("should display single selected item label", () => {
    render(
      <MultiSelect
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={["1"]}
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("Option 1");
  });

  it("should display count when multiple items selected", () => {
    render(
      <MultiSelect
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={["1", "2"]}
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("2件選択中");
  });

  it("should open popover when button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MultiSelect
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />
    );

    const button = screen.getByRole("button");
    await user.click(button);

    // Check if options are displayed
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  it("should call onChange when item is selected", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<MultiSelectProps["onChange"]>();

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />
    );

    const button = screen.getByRole("button");
    await user.click(button);

    // Click on Option 1
    const option1 = screen.getByText("Option 1");
    await user.click(option1);

    expect(handleChange).toHaveBeenCalledWith(["1"]);
  });

  it("should toggle selection when clicking already selected item", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<MultiSelectProps["onChange"]>();

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={["1"]}
      />
    );

    const button = screen.getByRole("button", { name: /option 1/iu });
    await user.click(button);

    // Click on Option 1 checkbox (already selected)
    const option1Checkbox = screen.getByRole("checkbox", {
      name: /option 1/iu,
    });
    await user.click(option1Checkbox);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('should select all items when "すべて選択" is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<MultiSelectProps["onChange"]>();

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));

    expect(handleChange).toHaveBeenCalledWith(["1", "2", "3"]);
  });

  it('should select all items when "すべて選択" is clicked while some are selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<MultiSelectProps["onChange"]>();

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={["2"]}
      />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));

    expect(handleChange).toHaveBeenCalledWith(["1", "2", "3"]);
  });

  it('should deselect all items when "すべて選択" is clicked while all are selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<MultiSelectProps["onChange"]>();

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={["1", "2", "3"]}
      />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it.each([
    { checked: "false", value: [] },
    { checked: "mixed", value: ["1"] },
    { checked: "true", value: ["1", "2", "3"] },
  ])(
    'should expose aria-checked="$checked" on "すべて選択" when $value.length items are selected',
    async ({ checked, value }) => {
      const user = userEvent.setup();

      render(
        <MultiSelect
          onChange={vi.fn<MultiSelectProps["onChange"]>()}
          options={defaultOptions}
          placeholder="Select items"
          value={value}
        />
      );

      await user.click(screen.getByRole("button"));

      expect(
        screen.getByRole("checkbox", { name: "すべて選択" })
      ).toHaveAttribute("aria-checked", checked);
    }
  );

  it("should use label as the accessible name of the trigger", () => {
    render(
      <MultiSelect
        label="表示状態"
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={["1", "2"]}
      />
    );

    const button = screen.getByRole("button", { name: "表示状態" });
    expect(button).toHaveTextContent("2件選択中");
  });

  it("should not share checkbox ids between MultiSelects with the same option values", async () => {
    const user = userEvent.setup();
    const handleFirstChange = vi.fn<MultiSelectProps["onChange"]>();
    const handleSecondChange = vi.fn<MultiSelectProps["onChange"]>();
    const options = [
      { label: "公開", value: "true" },
      { label: "非公開", value: "false" },
    ];

    render(
      <>
        <MultiSelect
          label="表示状態"
          onChange={handleFirstChange}
          options={options}
          value={[]}
        />
        <MultiSelect
          label="削除状態"
          onChange={handleSecondChange}
          options={options}
          value={[]}
        />
      </>
    );

    await user.click(screen.getByRole("button", { name: "表示状態" }));
    const firstIds = screen
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.id);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "削除状態" }));
    const secondIds = screen
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.id);

    expect(new Set([...firstIds, ...secondIds]).size).toBe(
      firstIds.length + secondIds.length
    );

    await user.click(screen.getByText("公開"));

    expect(handleSecondChange).toHaveBeenCalledWith(["true"]);
    expect(handleFirstChange).not.toHaveBeenCalled();
  });

  it("should accept custom className", () => {
    render(
      <MultiSelect
        className="custom-class"
        onChange={vi.fn<MultiSelectProps["onChange"]>()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
