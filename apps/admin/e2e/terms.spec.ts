import { expect, test } from "@playwright/test";

test.describe("Terms", () => {
  test("should display the terms of the mock data", async ({ page }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { level: 1, name: "用語管理" })
    ).toBeVisible();

    for (const { reading, synonyms, term } of [
      { reading: "うたわく", synonyms: "歌配信、カラオケ配信", term: "歌枠" },
      { reading: "げーむはいしん", synonyms: "ゲーム実況", term: "ゲーム配信" },
      { reading: "えーえすえむあーる", synonyms: "音フェチ", term: "ASMR" },
    ]) {
      const row = page
        .getByRole("row")
        .filter({ has: page.getByRole("cell", { exact: true, name: term }) });
      // oxlint-disable-next-line eslint/no-await-in-loop -- e2e checks run one at a time, so a failure names the first wrong row
      await expect(row.getByRole("cell").nth(1)).toHaveText(reading);
      // oxlint-disable-next-line eslint/no-await-in-loop -- e2e checks run one at a time, so a failure names the first wrong row
      await expect(row.getByRole("cell").nth(2)).toHaveText(synonyms);
    }
  });

  test("should edit the synonyms of a term in the modal", async ({ page }) => {
    await page.goto("/terms");

    await page
      .getByRole("row")
      .filter({ hasText: "歌枠" })
      .getByRole("button", { name: "編集" })
      .click();

    const dialog = page.getByRole("dialog", { name: "用語を編集" });
    const termInput = dialog.getByRole("textbox", { name: "用語" });
    const synonymInputs = dialog.getByPlaceholder("類義語を入力");

    // The focus moves to the term input, which does not wait for dnd-kit
    await expect(termInput).toBeFocused();
    await termInput.fill("歌枠（編集中）");

    // The sortable list replaces the placeholder once dnd-kit is loaded
    await expect(
      dialog.getByRole("button", { name: "類義語を追加" })
    ).toBeEnabled();
    await expect(termInput).toHaveValue("歌枠（編集中）");
    await expect(synonymInputs).toHaveCount(2);

    const synonymValues = () =>
      synonymInputs.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value)
      );

    expect(await synonymValues()).toEqual(["歌配信", "カラオケ配信"]);

    // Add and remove an input
    await dialog.getByRole("button", { name: "類義語を追加" }).click();
    await synonymInputs.nth(2).fill("歌ってみた");
    expect(await synonymValues()).toEqual([
      "歌配信",
      "カラオケ配信",
      "歌ってみた",
    ]);

    // The readings have only one input, so every remove button is a synonym's
    await dialog.getByRole("button", { name: "削除" }).first().click();
    expect(await synonymValues()).toEqual(["カラオケ配信", "歌ってみた"]);

    // The first handle belongs to the only reading
    const handles = dialog.getByRole("button", {
      name: "ドラッグして並び替え",
    });
    const synonymHandles = [handles.nth(1), handles.nth(2)] as const;

    // Reorder with the keyboard. Playwright presses the keys faster than a
    // person, and dnd-kit may ignore an arrow key pressed right after the drag
    // starts, so drop the row where it is and try again until it moves.
    // (Escape would also close the dialog.)
    await expect(async () => {
      await synonymHandles[0].focus();
      await page.keyboard.press("Space");

      try {
        await expect(
          page.getByText(/^Draggable item .+ was moved over droppable area /u)
        ).toBeAttached({ timeout: 1000 });
        await page.keyboard.press("ArrowDown");
        // Drop only after dnd-kit has moved the row over the next one
        await expect(
          page.getByText(
            /^Draggable item (?<item>\S+) was moved over droppable area (?!\k<item>\.)/u
          )
        ).toBeAttached({ timeout: 1000 });
      } catch (error) {
        await page.keyboard.press("Space");
        throw error;
      }

      await page.keyboard.press("Space");
    }).toPass();
    await expect.poll(synonymValues).toEqual(["歌ってみた", "カラオケ配信"]);

    // Reorder with the mouse
    const handleBox = await synonymHandles[0].boundingBox();
    const targetBox = await synonymHandles[1].boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error("The drag handles are not visible.");
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height,
      { steps: 10 }
    );
    await page.mouse.up();
    await expect.poll(synonymValues).toEqual(["カラオケ配信", "歌ってみた"]);
  });

  test("should search the terms on the server through the URL", async ({
    page,
  }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("navigation", { name: "頭文字の索引" })
    ).toBeVisible();

    await page.getByRole("searchbox", { name: "用語を検索" }).fill("ASMR");
    await expect(page).toHaveURL(/\/terms\?search=ASMR$/u);

    await expect(
      page.getByRole("cell", { exact: true, name: "ASMR" })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { exact: true, name: "歌枠" })
    ).toHaveCount(0);
    // The index is hidden while searching
    await expect(
      page.getByRole("navigation", { name: "頭文字の索引" })
    ).toHaveCount(0);
  });
});
