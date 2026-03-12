<script lang="ts">
  import { api } from "$lib/api";

  type Props = {
    onSubmit: (data: { name: string; url: string; category: string }) => Promise<void>;
    onCancel: () => void;
  };

  let { onSubmit, onCancel }: Props = $props();

  let url = $state("");
  let category = $state("");
  let fetchedTitle = $state<string | null>(null);
  let validating = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function handleValidate() {
    if (!url.trim()) return;
    validating = true;
    error = null;
    fetchedTitle = null;
    try {
      const result = await api.get<{ title: string; url: string }>(
        `/api/sources/validate?url=${encodeURIComponent(url.trim())}`
      );
      fetchedTitle = result.title;
    } catch (e) {
      error = String(e);
    } finally {
      validating = false;
    }
  }

  async function handleSubmit() {
    if (!fetchedTitle) return;
    submitting = true;
    error = null;
    try {
      await onSubmit({
        name: fetchedTitle,
        url: url.trim(),
        category: category.trim(),
      });
      url = "";
      category = "";
      fetchedTitle = null;
    } catch (e) {
      error = String(e);
    } finally {
      submitting = false;
    }
  }

  function handleReset() {
    fetchedTitle = null;
    error = null;
  }
</script>

<div class="card bg-base-100 border border-base-300 shadow-sm">
  <div class="card-body gap-4">
    <h2 class="card-title text-base">RSSソースを追加</h2>

    {#if error}
      <div role="alert" class="alert alert-error">
        <span>{error}</span>
      </div>
    {/if}

    {#if fetchedTitle === null}
      <!-- Step 1: URL入力 -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <fieldset class="fieldset flex-1">
          <legend class="fieldset-legend">
            RSS URL <span class="text-error">*</span>
          </legend>
          <input
            type="url"
            class="input input-bordered w-full"
            bind:value={url}
            placeholder="https://example.com/feed.xml"
            aria-label="RSS URL"
            onkeydown={(e) => e.key === "Enter" && handleValidate()}
          />
        </fieldset>
        <button
          class="btn btn-primary"
          onclick={handleValidate}
          disabled={validating || !url.trim()}
        >
          {validating ? "確認中..." : "確認"}
        </button>
        <button class="btn btn-ghost" onclick={onCancel}>
          キャンセル
        </button>
      </div>
    {:else}
      <!-- Step 2: タイトル確認・保存 -->
      <div class="flex flex-col gap-3">
        <div class="bg-base-200 rounded-box px-4 py-3 text-sm">
          <div class="text-base-content/50 text-xs mb-1">取得したフィード名</div>
          <div class="font-medium">{fetchedTitle}</div>
          <div class="text-xs text-base-content/40 mt-1 break-all">{url}</div>
        </div>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">カテゴリ</legend>
          <input
            type="text"
            class="input input-bordered w-full"
            bind:value={category}
            placeholder="tech, news など"
            aria-label="カテゴリ"
          />
        </fieldset>
      </div>
      <div class="card-actions">
        <button
          class="btn btn-primary"
          onclick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "登録中..." : "保存"}
        </button>
        <button class="btn btn-ghost" onclick={handleReset}>
          URLを変更
        </button>
        <button class="btn btn-ghost" onclick={onCancel}>
          キャンセル
        </button>
      </div>
    {/if}
  </div>
</div>
