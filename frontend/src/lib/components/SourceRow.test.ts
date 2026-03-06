import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import SourceRow from "./SourceRow.svelte";
import type { Source } from "$lib/utils/sources";

const baseSource: Source = {
  id: "1",
  name: "Example Feed",
  url: "https://example.com/feed.xml",
  category: "tech",
  tags: [],
  isActive: true,
  fetchIntervalMinutes: 60,
  lastFetchedAt: null,
  consecutiveErrors: 0,
};

function setup(
  source: Partial<Source> = {},
  onToggle = vi.fn(),
  onSave = vi.fn().mockResolvedValue(undefined),
  onDelete = vi.fn()
) {
  const user = userEvent.setup();
  render(SourceRow, {
    props: {
      source: { ...baseSource, ...source },
      onToggle,
      onSave,
      onDelete,
    },
  });
  return { user, onToggle, onSave, onDelete };
}

describe("SourceRow — 表示モード", () => {
  it("ソース名・URL・カテゴリが表示される", () => {
    setup();
    expect(screen.getByText("Example Feed")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/feed.xml")
    ).toBeInTheDocument();
    expect(screen.getByText("tech")).toBeInTheDocument();
  });

  it("有効なソースに「有効」バッジが表示される", () => {
    setup({ isActive: true, consecutiveErrors: 0 });
    expect(screen.getByText("有効")).toBeInTheDocument();
  });

  it("無効なソースに「無効」バッジが表示される", () => {
    setup({ isActive: false, consecutiveErrors: 0 });
    expect(screen.getByText("無効")).toBeInTheDocument();
  });

  it("consecutiveErrors >= 3 で「自動停止」バッジ", () => {
    setup({ consecutiveErrors: 3 });
    expect(screen.getByText("自動停止")).toBeInTheDocument();
  });

  it("lastFetchedAt が null のとき「未取得」が表示される", () => {
    setup({ lastFetchedAt: null });
    expect(screen.getByText("未取得")).toBeInTheDocument();
  });

  it("有効ソースのとき「無効化」ボタンが表示される", () => {
    setup({ isActive: true });
    expect(
      screen.getByRole("button", { name: "無効化" })
    ).toBeInTheDocument();
  });

  it("無効ソースのとき「有効化」ボタンが表示される", () => {
    setup({ isActive: false });
    expect(
      screen.getByRole("button", { name: "有効化" })
    ).toBeInTheDocument();
  });
});

describe("SourceRow — 操作", () => {
  it("トグルボタンクリックで onToggle が呼ばれる", async () => {
    const { user, onToggle } = setup();
    await user.click(screen.getByRole("button", { name: "無効化" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("削除ボタンクリック → confirm OK で onDelete が呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    const { user, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("削除ボタンクリック → confirm キャンセルで onDelete は呼ばれない", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const { user, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("SourceRow — 編集モード", () => {
  it("編集ボタンで入力フィールドが表示される", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(
      screen.getByRole("textbox", { name: "名前" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "カテゴリ" })
    ).toBeInTheDocument();
  });

  it("編集フィールドにソースの現在値が入る", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveValue(
      "Example Feed"
    );
    expect(screen.getByRole("textbox", { name: "カテゴリ" })).toHaveValue(
      "tech"
    );
  });

  it("保存ボタンで onSave が編集後の値で呼ばれる", async () => {
    const { user, onSave } = setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    const nameInput = screen.getByRole("textbox", { name: "名前" });
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Feed");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Feed" })
    );
  });

  it("取消ボタンで表示モードに戻る", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByText("Example Feed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "編集" })
    ).toBeInTheDocument();
  });
});
