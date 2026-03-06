import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import SourceAddForm from "./SourceAddForm.svelte";

function setup(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  onCancel = vi.fn()
) {
  const user = userEvent.setup();
  render(SourceAddForm, { props: { onSubmit, onCancel } });
  return { user, onSubmit, onCancel };
}

describe("SourceAddForm", () => {
  it("フォームフィールドが表示される", () => {
    setup();
    expect(screen.getByRole("textbox", { name: "RSS URL" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "名前" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "カテゴリ" })
    ).toBeInTheDocument();
  });

  it("URL が空のとき登録ボタンが無効", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "登録" })
    ).toBeDisabled();
  });

  it("URL を入力すると登録ボタンが有効になる", async () => {
    const { user } = setup();
    await user.type(
      screen.getByRole("textbox", { name: "RSS URL" }),
      "https://example.com/feed.xml"
    );
    expect(screen.getByRole("button", { name: "登録" })).toBeEnabled();
  });

  it("フォーム送信で onSubmit が正しいデータで呼ばれる", async () => {
    const { user, onSubmit } = setup();
    await user.type(
      screen.getByRole("textbox", { name: "RSS URL" }),
      "https://example.com/feed.xml"
    );
    await user.type(screen.getByRole("textbox", { name: "名前" }), "Example");
    await user.type(
      screen.getByRole("textbox", { name: "カテゴリ" }),
      "tech"
    );
    await user.click(screen.getByRole("button", { name: "登録" }));
    expect(onSubmit).toHaveBeenCalledWith({
      url: "https://example.com/feed.xml",
      name: "Example",
      category: "tech",
    });
  });

  it("onSubmit が失敗したときエラーが表示される", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("登録に失敗しました"));
    const { user } = setup(onSubmit);
    await user.type(
      screen.getByRole("textbox", { name: "RSS URL" }),
      "https://example.com/feed.xml"
    );
    await user.click(screen.getByRole("button", { name: "登録" }));
    expect(
      await screen.findByText(/登録に失敗しました/)
    ).toBeInTheDocument();
  });

  it("キャンセルボタンで onCancel が呼ばれる", async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
