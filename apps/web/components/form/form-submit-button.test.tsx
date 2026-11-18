import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormSubmitButton } from "./form-submit-button";

describe("FormSubmitButton", () => {
  it("is enabled before the form is submitted", () => {
    render(
      <form>
        <FormSubmitButton />
      </form>
    );

    expect(screen.getByRole("button", { name: "送信する" })).toBeEnabled();
  });

  it("is disabled and shows the pending label while submitting", async () => {
    const { promise, resolve } = Promise.withResolvers<void>();

    const { container } = render(
      <form action={() => promise}>
        <FormSubmitButton />
      </form>
    );

    await act(async () => {
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    });

    expect(screen.getByRole("button", { name: "送信中..." })).toBeDisabled();

    await act(async () => {
      resolve();
    });

    expect(screen.getByRole("button", { name: "送信する" })).toBeEnabled();
  });
});
