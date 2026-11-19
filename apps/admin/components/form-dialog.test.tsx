import { Button } from "@shinju-date/ui";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { redirect } from "next/navigation";
import { Component } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SERVER_ACTION_FALLBACK_ERROR } from "@/lib/use-server-action";

import { ErrorMessage, FormField, Input, Label } from "./form";
import type { FormState } from "./form";
import { FormDialog } from "./form-dialog";
import type { FormDialogProps } from "./form-dialog";

type Action = FormDialogProps["action"];
type OnSuccess = NonNullable<FormDialogProps["onSuccess"]>;

interface ErrorCatcherProps {
  children: ReactNode;
}

interface ErrorCatcherState {
  error: unknown;
}

/** 部品が投げた例外を受け取り、その文を表示する */
class ErrorCatcher extends Component<ErrorCatcherProps, ErrorCatcherState> {
  static getDerivedStateFromError(error: unknown): ErrorCatcherState {
    return { error };
  }

  constructor(props: ErrorCatcherProps) {
    super(props);
    this.state = { error: null };
  }

  override render() {
    const { error } = this.state;

    if (error) {
      return (
        <p>caught: {error instanceof Error ? error.message : "unknown"}</p>
      );
    }

    return this.props.children;
  }
}

const renderDialog = (
  action: Action,
  overrides: Partial<
    Pick<FormDialogProps, "description" | "onSuccess" | "size">
  > = {}
) => {
  const actionMock = vi.fn<Action>(action);

  render(
    <FormDialog
      action={actionMock}
      submitLabel="追加"
      title="用語を追加"
      trigger={<Button>開く</Button>}
      {...overrides}
    >
      <FormField name="term">
        <Label>用語</Label>
        <Input defaultValue="初期値" />
        <ErrorMessage />
      </FormField>
    </FormDialog>
  );

  return { action: actionMock };
};

const openDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: "開く" }));

  return screen.getByRole("dialog", { name: "用語を追加" });
};

const getTermInput = (dialog: HTMLElement) =>
  within(dialog).getByRole<HTMLInputElement>("textbox", {
    name: "用語",
  });

const submit = (dialog: HTMLElement) => {
  fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));
};

/** Submits a dialog whose action returns `state`. */
const submitReturning = (state: FormState) => {
  const onSuccess = vi.fn<OnSuccess>();
  const { action } = renderDialog(() => state, { onSuccess });

  const dialog = openDialog();

  submit(dialog);

  return { action, dialog, onSuccess };
};

const renderFailingDialog = () => {
  renderDialog(() => ({
    error: "用語の追加に失敗しました。",
    errors: { term: ["用語が長すぎます。"] },
  }));

  const dialog = openDialog();

  fireEvent.change(getTermInput(dialog), { target: { value: "長い用語" } });
  submit(dialog);

  return dialog;
};

const renderThrowingOnce = () => {
  const onSuccess = vi.fn<OnSuccess>();
  const { action } = renderDialog(
    vi
      .fn<Action>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ success: true }),
    { onSuccess }
  );

  const dialog = openDialog();

  fireEvent.change(getTermInput(dialog), { target: { value: "歌枠" } });
  submit(dialog);

  return { action, dialog, onSuccess };
};

describe(FormDialog, () => {
  it("opens with the trigger and shows the title and the fields", () => {
    renderDialog(() => ({ success: true }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = openDialog();

    expect(getTermInput(dialog)).toHaveValue("初期値");
    expect(
      within(dialog).getByRole("button", { name: "キャンセル" })
    ).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "追加" })).toBeEnabled();
  });

  it("describes the dialog with the description", () => {
    renderDialog(() => ({ success: true }), {
      description: "検索に使う用語を追加します。",
    });

    expect(openDialog()).toHaveAccessibleDescription(
      "検索に使う用語を追加します。"
    );
  });

  it("does not warn about a missing description", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      renderDialog(() => ({ success: true }));

      expect(openDialog()).not.toHaveAttribute("aria-describedby");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('widens the dialog with `size="lg"`', () => {
    renderDialog(() => ({ success: true }), { size: "lg" });

    expect(openDialog()).toHaveClass("max-w-lg");
  });

  it("passes the form data to the action", async () => {
    const { action } = renderDialog(() => ({ success: true }));

    const dialog = openDialog();

    fireEvent.change(getTermInput(dialog), { target: { value: "歌枠" } });
    submit(dialog);

    await waitFor(() => expect(action).toHaveBeenCalledOnce());

    const [currentState, formData] = action.mock.calls[0] ?? [];

    expect(currentState).toStrictEqual({});
    expect((formData as FormData).get("term")).toBe("歌枠");
  });

  it("closes and calls `onSuccess` when the action succeeds", async () => {
    const onSuccess = vi.fn<OnSuccess>();

    renderDialog(() => ({ success: true }), { onSuccess });

    submit(openDialog());

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("stays open and shows the message on a validation error", async () => {
    const onSuccess = vi.fn<OnSuccess>();

    renderDialog(() => ({ errors: { term: ["用語を入力してください。"] } }), {
      onSuccess,
    });

    const dialog = openDialog();

    submit(dialog);

    await expect(
      within(dialog).findByText("用語を入力してください。")
    ).resolves.toBeInTheDocument();
    expect(getTermInput(dialog)).toBeInvalid();
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each<[string, FormState, string]>([
    [
      "`error`",
      { error: "用語の追加に失敗しました。" },
      "用語の追加に失敗しました。",
    ],
    [
      "`errors.generic`",
      { errors: { generic: ["用語の追加に失敗しました。"] } },
      "用語の追加に失敗しました。",
    ],
  ])(
    "stays open and shows the message when the action returns %s",
    async (_name, state, message) => {
      const { action, dialog, onSuccess } = submitReturning(state);

      await waitFor(() => expect(action).toHaveBeenCalledOnce());
      await expect(
        within(dialog).findByRole("alert")
      ).resolves.toHaveTextContent(message);
      await waitFor(() =>
        expect(
          within(dialog).getByRole("button", { name: "追加" })
        ).toBeEnabled()
      );
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(onSuccess).not.toHaveBeenCalled();
    }
  );

  // 成功を示す値がなければ、エラーがなくても閉じない
  it("stays open when the action returns an empty state", async () => {
    const { action, dialog, onSuccess } = submitReturning({});

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "追加" })).toBeEnabled()
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows the errors and keeps the typed value after a failure", async () => {
    const dialog = renderFailingDialog();

    await expect(
      within(dialog).findByText("用語の追加に失敗しました。")
    ).resolves.toBeInTheDocument();
    expect(within(dialog).getByText("用語が長すぎます。")).toBeInTheDocument();
    expect(getTermInput(dialog)).toHaveValue("長い用語");
  });

  it("resets the fields and the errors when opened again after a failure", async () => {
    const dialog = renderFailingDialog();

    await within(dialog).findByText("用語の追加に失敗しました。");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    const reopened = openDialog();

    expect(getTermInput(reopened)).toHaveValue("初期値");
    expect(getTermInput(reopened)).toBeValid();
    expect(within(reopened).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      within(reopened).queryByText("用語が長すぎます。")
    ).not.toBeInTheDocument();
  });

  it("resets the fields when opened again after a success", async () => {
    renderDialog(() => ({ success: true }));

    const dialog = openDialog();

    fireEvent.change(getTermInput(dialog), { target: { value: "歌枠" } });
    submit(dialog);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    const reopened = openDialog();

    expect(getTermInput(reopened)).toHaveValue("初期値");
    expect(within(reopened).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a fallback error and keeps the fields when the action throws", async () => {
    const { dialog, onSuccess } = renderThrowingOnce();

    await expect(within(dialog).findByRole("alert")).resolves.toHaveTextContent(
      SERVER_ACTION_FALLBACK_ERROR
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(getTermInput(dialog)).toHaveValue("歌枠");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("submits the kept fields again after the action throws", async () => {
    const { action, dialog, onSuccess } = renderThrowingOnce();

    await within(dialog).findByRole("alert");
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "追加" })).toBeEnabled()
    );

    submit(dialog);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(action).toHaveBeenCalledTimes(2);

    const [, formData] = action.mock.calls[1] ?? [];

    expect((formData as FormData).get("term")).toBe("歌枠");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("closes with Escape again after the action throws", async () => {
    renderDialog(() => Promise.reject(new Error("network")));

    const dialog = openDialog();

    submit(dialog);

    await expect(
      within(dialog).findByRole("alert")
    ).resolves.toBeInTheDocument();

    fireEvent.keyDown(dialog, { code: "Escape", key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("leaves the errors that Next.js uses, such as a redirect, to Next.js", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      render(
        <ErrorCatcher>
          <FormDialog
            action={() => Promise.resolve().then(() => redirect("/login"))}
            submitLabel="追加"
            title="用語を追加"
            trigger={<Button>開く</Button>}
          >
            <FormField name="term">
              <Label>用語</Label>
              <Input />
            </FormField>
          </FormDialog>
        </ErrorCatcher>
      );

      submit(openDialog());

      await expect(
        screen.findByText("caught: NEXT_REDIRECT")
      ).resolves.toBeInTheDocument();
      expect(
        screen.queryByText(SERVER_ACTION_FALLBACK_ERROR)
      ).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not close with Escape, an outside click or the cancel button while submitting", async () => {
    const deferred = Promise.withResolvers<FormState>();

    renderDialog(() => deferred.promise);

    const dialog = openDialog();

    submit(dialog);

    const cancelButton = within(dialog).getByRole("button", {
      name: "キャンセル",
    });

    await waitFor(() => expect(cancelButton).toBeDisabled());
    expect(within(dialog).getByRole("button", { name: "追加" })).toBeDisabled();

    fireEvent.keyDown(dialog, { code: "Escape", key: "Escape" });
    fireEvent.pointerDown(document.body);
    fireEvent.click(cancelButton);

    expect(screen.getByRole("dialog")).toBe(dialog);

    await act(async () => {
      deferred.resolve({ success: true });
      await deferred.promise;
    });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("closes with Escape or the cancel button again after a failed submission", async () => {
    const deferred = Promise.withResolvers<FormState>();

    renderDialog(() => deferred.promise);

    const dialog = openDialog();

    submit(dialog);

    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "キャンセル" })
      ).toBeDisabled()
    );

    await act(async () => {
      deferred.resolve({ error: "用語の追加に失敗しました。" });
      await deferred.promise;
    });

    await expect(
      within(dialog).findByRole("alert")
    ).resolves.toBeInTheDocument();

    fireEvent.keyDown(dialog, { code: "Escape", key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
