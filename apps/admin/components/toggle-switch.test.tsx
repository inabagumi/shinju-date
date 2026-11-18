import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import ToggleSwitch from "./toggle-switch";

interface ControlledToggleSwitchProps {
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

const ControlledToggleSwitch = ({
  defaultChecked = false,
  onChange,
}: ControlledToggleSwitchProps) => {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <ToggleSwitch
      checked={checked}
      label="メンテナンスモード"
      onChange={(nextChecked) => {
        setChecked(nextChecked);
        onChange?.(nextChecked);
      }}
    />
  );
};

describe(ToggleSwitch, () => {
  it("renders a switch with the label and the checked state", () => {
    const { rerender } = render(
      <ToggleSwitch checked={false} label="メンテナンスモード" />
    );

    const toggle = screen.getByRole("switch", { name: "メンテナンスモード" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("type", "button");

    rerender(<ToggleSwitch checked label="メンテナンスモード" />);

    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the opposite of checked on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(checked: boolean) => void>();
    const { rerender } = render(
      <ToggleSwitch
        checked={false}
        label="メンテナンスモード"
        onChange={onChange}
      />
    );

    await user.click(
      screen.getByRole("switch", { name: "メンテナンスモード" })
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);

    onChange.mockClear();
    rerender(
      <ToggleSwitch checked label="メンテナンスモード" onChange={onChange} />
    );

    await user.click(
      screen.getByRole("switch", { name: "メンテナンスモード" })
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("toggles aria-checked when the parent updates checked", async () => {
    const user = userEvent.setup();
    render(<ControlledToggleSwitch />);

    const toggle = screen.getByRole("switch", { name: "メンテナンスモード" });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles with the Space and Enter keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(checked: boolean) => void>();
    render(<ControlledToggleSwitch onChange={onChange} />);

    const toggle = screen.getByRole("switch", { name: "メンテナンスモード" });

    await user.tab();

    expect(toggle).toHaveFocus();

    await user.keyboard(" ");

    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Enter}");

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(onChange.mock.calls).toStrictEqual([[true], [false]]);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(checked: boolean) => void>();
    render(
      <ToggleSwitch
        checked={false}
        disabled
        label="メンテナンスモード"
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole("switch", { name: "メンテナンスモード" });

    expect(toggle).toBeDisabled();

    await user.click(toggle);
    await user.tab();

    // 無効のときは、フォーカスも移らない
    expect(toggle).not.toHaveFocus();

    await user.keyboard(" {Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("works without onChange", async () => {
    const user = userEvent.setup();
    render(<ToggleSwitch checked={false} label="メンテナンスモード" />);

    const toggle = screen.getByRole("switch", { name: "メンテナンスモード" });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
