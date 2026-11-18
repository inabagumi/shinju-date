import type { Tables } from "@shinju-date/database";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markFeatureRequestAsReadAction: vi.fn(),
  updateFeatureRequestMemoAction: vi.fn(),
  updateFeatureRequestStatusAction: vi.fn(),
}));

vi.mock("../../_actions/update-feedback", () => ({
  markFeatureRequestAsReadAction: mocks.markFeatureRequestAsReadAction,
  updateFeatureRequestMemoAction: mocks.updateFeatureRequestMemoAction,
  updateFeatureRequestStatusAction: mocks.updateFeatureRequestStatusAction,
}));

const { FeatureRequestDetail } = await import("./feedback-detail");

const FEEDBACK_ID = "70000000-0000-0000-0000-000000000001";

const featureRequest: Tables<"feature_requests"> = {
  admin_memo: "担当者に確認する。",
  created_at: "2026-11-01T00:00:00Z",
  id: FEEDBACK_ID,
  is_read: false,
  message: "検索の絞り込みがほしい",
  status: "pending",
  updated_at: "2026-11-01T00:00:00Z",
};

/** The form that holds the button */
function getForm(buttonName: string): HTMLFormElement {
  const form = screen.getByRole("button", { name: buttonName }).closest("form");

  if (!form) {
    throw new Error(`No form holds the button ${buttonName}`);
  }

  return form;
}

/** The `FormData` that the action was last called with, as an object */
function submittedValues(action: ReturnType<typeof vi.fn>) {
  const [, formData] = action.mock.lastCall as [unknown, FormData];

  return Object.fromEntries(formData);
}

describe("FeatureRequestDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("message", () => {
    it("renders the message as Markdown", () => {
      render(
        <FeatureRequestDetail
          featureRequest={{
            ...featureRequest,
            message:
              "**検索**の改善\n\n- 絞り込み\n- 並べ替え\n\n[詳細](https://example.com/)",
          }}
        />
      );

      expect(screen.getByText("検索").tagName).toBe("STRONG");
      expect(
        screen.getAllByRole("listitem").map((item) => item.textContent)
      ).toEqual(["絞り込み", "並べ替え"]);
      expect(screen.getByRole("link", { name: "詳細" })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
    });
  });

  describe("status", () => {
    it("submits the selected status and tells that it was updated", async () => {
      mocks.updateFeatureRequestStatusAction.mockResolvedValue({
        success: true,
      });

      render(<FeatureRequestDetail featureRequest={featureRequest} />);

      const form = getForm("ステータスを更新");

      fireEvent.change(within(form).getByLabelText("対応ステータス"), {
        target: { value: "in_progress" },
      });
      fireEvent.click(
        within(form).getByRole("button", { name: "ステータスを更新" })
      );

      await expect(
        within(form).findByRole("status")
      ).resolves.toHaveTextContent("更新しました。");
      expect(submittedValues(mocks.updateFeatureRequestStatusAction)).toEqual({
        id: FEEDBACK_ID,
        status: "in_progress",
      });
    });

    it("shows the error in the form when the update fails", async () => {
      mocks.updateFeatureRequestStatusAction.mockResolvedValue({
        errors: { generic: ["ステータスの更新に失敗しました。"] },
      });

      render(<FeatureRequestDetail featureRequest={featureRequest} />);

      const form = getForm("ステータスを更新");

      fireEvent.click(
        within(form).getByRole("button", { name: "ステータスを更新" })
      );

      await expect(within(form).findByRole("alert")).resolves.toHaveTextContent(
        "ステータスの更新に失敗しました。"
      );
      expect(within(form).queryByRole("status")).toBeNull();
    });
  });

  describe("memo", () => {
    it("submits the memo and tells that it was saved", async () => {
      mocks.updateFeatureRequestMemoAction.mockResolvedValue({ success: true });

      render(<FeatureRequestDetail featureRequest={featureRequest} />);

      const form = getForm("メモを保存");
      const textarea = within(form).getByLabelText("メモ（Markdown対応）");

      expect(textarea).toHaveValue("担当者に確認する。");

      fireEvent.change(textarea, {
        target: { value: "次の四半期に対応する。" },
      });
      fireEvent.click(within(form).getByRole("button", { name: "メモを保存" }));

      await expect(
        within(form).findByRole("status")
      ).resolves.toHaveTextContent("保存しました。");
      expect(submittedValues(mocks.updateFeatureRequestMemoAction)).toEqual({
        admin_memo: "次の四半期に対応する。",
        id: FEEDBACK_ID,
      });
    });

    it("shows the error in the form when saving fails", async () => {
      mocks.updateFeatureRequestMemoAction.mockResolvedValue({
        errors: { generic: ["メモの更新に失敗しました。"] },
      });

      render(<FeatureRequestDetail featureRequest={featureRequest} />);

      const form = getForm("メモを保存");

      fireEvent.click(within(form).getByRole("button", { name: "メモを保存" }));

      await expect(within(form).findByRole("alert")).resolves.toHaveTextContent(
        "メモの更新に失敗しました。"
      );
      expect(within(form).queryByRole("status")).toBeNull();
    });
  });

  describe("read state", () => {
    it.each([
      { button: "既読にする", isRead: false, submitted: "true" },
      { button: "未読にする", isRead: true, submitted: "false" },
    ])(
      'submits the opposite state with "$button"',
      async ({ button, isRead, submitted }) => {
        mocks.markFeatureRequestAsReadAction.mockResolvedValue({
          success: true,
        });

        render(
          <FeatureRequestDetail
            featureRequest={{ ...featureRequest, is_read: isRead }}
          />
        );

        const form = getForm(button);

        fireEvent.click(within(form).getByRole("button", { name: button }));

        await expect(
          within(form).findByRole("status")
        ).resolves.toHaveTextContent("更新しました。");
        expect(submittedValues(mocks.markFeatureRequestAsReadAction)).toEqual({
          id: FEEDBACK_ID,
          is_read: submitted,
        });
      }
    );

    it("shows the error in the form when the update fails", async () => {
      mocks.markFeatureRequestAsReadAction.mockResolvedValue({
        errors: { generic: ["既読状態の更新に失敗しました。"] },
      });

      render(<FeatureRequestDetail featureRequest={featureRequest} />);

      const form = getForm("既読にする");

      fireEvent.click(within(form).getByRole("button", { name: "既読にする" }));

      await expect(within(form).findByRole("alert")).resolves.toHaveTextContent(
        "既読状態の更新に失敗しました。"
      );
      expect(within(form).queryByRole("status")).toBeNull();
    });
  });
});
