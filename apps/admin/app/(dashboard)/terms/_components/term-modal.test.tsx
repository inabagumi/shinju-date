import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => {
  let release: () => void = () => {};
  const sortableInputListLoaded = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    createTermAction: vi.fn(),
    releaseSortableInputList: () => release(),
    sortableInputListLoaded,
    updateTermAction: vi.fn(),
  };
});

vi.mock("../_actions", () => ({
  createTermAction: mocks.createTermAction,
  updateTermAction: mocks.updateTermAction,
}));

// モーダルを開いてから dnd-kit を読み込み終えるまでの状態を確かめるため、
// 読み込みが終わる時点をテストから決められるようにする
vi.mock("./sortable-input-list", async (importOriginal) => {
  await mocks.sortableInputListLoaded;

  return importOriginal();
});

const { TermModal } = await import("./term-modal");

const term = {
  id: "term-1",
  readings: ["しんじゅ"],
  synonyms: ["真珠", "パール"],
  term: "SHINJU",
};

function getReadingInputs(dialog: HTMLElement) {
  return within(dialog).getAllByPlaceholderText<HTMLInputElement>(
    "読み方を入力"
  );
}

function getSynonymInputs(dialog: HTMLElement) {
  return within(dialog).getAllByPlaceholderText<HTMLInputElement>(
    "類義語を入力"
  );
}

function getSubmittedValues(formData: FormData, name: string) {
  return [...formData.entries()]
    .filter(([key]) => key.startsWith(`${name}[`))
    .map(([, value]) => value);
}

async function waitForSortableInputList(dialog: HTMLElement) {
  await waitFor(() => {
    expect(
      within(dialog).getByRole("button", { name: "読み方を追加" })
    ).toBeEnabled();
  });
}

describe("TermModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTermAction.mockResolvedValue({ success: true });
    mocks.updateTermAction.mockResolvedValue({ success: true });
  });

  describe("submitting", () => {
    it("closes the dialog when the action succeeds", async () => {
      render(<TermModal term={term} />);

      fireEvent.click(screen.getByRole("button", { name: "編集" }));

      const dialog = screen.getByRole("dialog", { name: "用語を編集" });

      fireEvent.click(within(dialog).getByRole("button", { name: "更新" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(mocks.updateTermAction).toHaveBeenCalledOnce();
      expect(mocks.createTermAction).not.toHaveBeenCalled();
    });

    it.each([
      [
        "a validation error",
        { errors: { term: ["用語を入力してください。"] } },
        "用語を入力してください。",
      ],
      [
        "an error that belongs to no field",
        { error: "用語の追加に失敗しました。" },
        "用語の追加に失敗しました。",
      ],
    ])("keeps the dialog open on %s", async (_name, state, message) => {
      mocks.createTermAction.mockResolvedValue(state);

      render(<TermModal />);

      fireEvent.click(screen.getByRole("button", { name: "新しい用語を追加" }));

      const dialog = screen.getByRole("dialog", { name: "新しい用語を追加" });

      fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));

      await expect(
        within(dialog).findByText(message)
      ).resolves.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(mocks.updateTermAction).not.toHaveBeenCalled();
    });
  });

  describe("while the sortable list is loading", () => {
    it("keeps what is typed right after opening and submits the current values", async () => {
      render(<TermModal term={term} />);

      fireEvent.click(screen.getByRole("button", { name: "編集" }));

      const dialog = screen.getByRole("dialog", { name: "用語を編集" });
      const termInput = within(dialog).getByDisplayValue("SHINJU");

      // フォーカスは最初の入力欄（用語）に移る
      expect(termInput).toHaveFocus();

      // 並べ替えの部品を読み込むまでは、同じ位置に操作できない入力欄を出す
      expect(getReadingInputs(dialog).map((input) => input.value)).toEqual([
        "しんじゅ",
      ]);
      expect(getSynonymInputs(dialog).map((input) => input.value)).toEqual([
        "真珠",
        "パール",
      ]);
      for (const input of [
        ...getReadingInputs(dialog),
        ...getSynonymInputs(dialog),
      ]) {
        expect(input).toBeDisabled();
      }

      fireEvent.change(termInput, { target: { value: "SHINJU DATE" } });

      // 読み込み中に送信しても、読み方と類義語は消えない
      fireEvent.click(within(dialog).getByRole("button", { name: "更新" }));

      await waitFor(() => {
        expect(mocks.updateTermAction).toHaveBeenCalledOnce();
      });

      const formData = mocks.updateTermAction.mock.calls[0]?.[1] as FormData;

      expect(formData.get("term")).toBe("SHINJU DATE");
      expect(getSubmittedValues(formData, "readings")).toEqual(["しんじゅ"]);
      expect(getSubmittedValues(formData, "synonyms")).toEqual([
        "真珠",
        "パール",
      ]);
    });

    it("keeps what is typed after the sortable list is loaded", async () => {
      render(<TermModal />);

      fireEvent.click(screen.getByRole("button", { name: "新しい用語を追加" }));

      const dialog = screen.getByRole("dialog", { name: "新しい用語を追加" });
      const termInput = within(dialog).getByRole("textbox", { name: "用語" });

      expect(termInput).toHaveFocus();
      expect(getReadingInputs(dialog)[0]).toBeDisabled();

      fireEvent.change(termInput, { target: { value: "新しい用語" } });

      await act(async () => {
        mocks.releaseSortableInputList();
        await mocks.sortableInputListLoaded;
      });

      await waitForSortableInputList(dialog);

      expect(termInput).toBeInTheDocument();
      expect(termInput).toHaveValue("新しい用語");
      expect(getReadingInputs(dialog)[0]).toBeEnabled();
    });
  });

  describe("after the sortable list is loaded", () => {
    const originalGetBoundingClientRect =
      HTMLElement.prototype.getBoundingClientRect;

    beforeAll(() => {
      mocks.releaseSortableInputList();

      // jsdom はレイアウトを計算しないため、キーボードでの並べ替えに必要な
      // 位置を、兄弟要素の中の順番から決める
      HTMLElement.prototype.getBoundingClientRect = function () {
        const siblings = this.parentElement
          ? [...this.parentElement.children]
          : [];
        const index = Math.max(siblings.indexOf(this), 0);

        return new DOMRect(0, index * 40, 300, 40);
      };
    });

    afterAll(() => {
      HTMLElement.prototype.getBoundingClientRect =
        originalGetBoundingClientRect;
    });

    it("adds and removes inputs", async () => {
      render(<TermModal />);

      fireEvent.click(screen.getByRole("button", { name: "新しい用語を追加" }));

      const dialog = screen.getByRole("dialog", { name: "新しい用語を追加" });

      await waitForSortableInputList(dialog);

      fireEvent.change(getReadingInputs(dialog)[0] as HTMLInputElement, {
        target: { value: "あ" },
      });
      fireEvent.click(
        within(dialog).getByRole("button", { name: "読み方を追加" })
      );

      expect(getReadingInputs(dialog)).toHaveLength(2);

      fireEvent.change(getReadingInputs(dialog)[1] as HTMLInputElement, {
        target: { value: "い" },
      });

      expect(getReadingInputs(dialog).map((input) => input.value)).toEqual([
        "あ",
        "い",
      ]);

      const [firstRemoveButton] = within(dialog).getAllByRole("button", {
        name: "削除",
      });
      fireEvent.click(firstRemoveButton as HTMLElement);

      expect(getReadingInputs(dialog).map((input) => input.value)).toEqual([
        "い",
      ]);
      // 入力欄が1つのときは削除のボタンを出さない
      expect(
        within(dialog).queryByRole("button", { name: "削除" })
      ).not.toBeInTheDocument();
    });

    it("reorders inputs with the keyboard", async () => {
      render(<TermModal term={term} />);

      fireEvent.click(screen.getByRole("button", { name: "編集" }));

      const dialog = screen.getByRole("dialog", { name: "用語を編集" });

      await waitForSortableInputList(dialog);

      const [, firstSynonymHandle] = within(dialog).getAllByRole("button", {
        name: "ドラッグして並び替え",
      });

      if (!firstSynonymHandle) {
        throw new Error("The drag handle of the first synonym is missing.");
      }

      firstSynonymHandle.focus();

      // dnd-kit はキーを押すたびに位置を測り直すため、1回ずつ反映を待つ
      for (const code of ["Space", "ArrowDown", "Space"]) {
        await act(async () => {
          fireEvent.keyDown(firstSynonymHandle, { code });
          await new Promise((resolve) => requestAnimationFrame(resolve));
        });
      }

      await waitFor(() => {
        expect(getSynonymInputs(dialog).map((input) => input.value)).toEqual([
          "パール",
          "真珠",
        ]);
      });

      fireEvent.click(within(dialog).getByRole("button", { name: "更新" }));

      await waitFor(() => {
        expect(mocks.updateTermAction).toHaveBeenCalledOnce();
      });

      const formData = mocks.updateTermAction.mock.calls[0]?.[1] as FormData;

      expect(getSubmittedValues(formData, "synonyms")).toEqual([
        "パール",
        "真珠",
      ]);
    });
  });
});
