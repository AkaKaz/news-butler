<script lang="ts">
  type Props = {
    onSubmit: (data: {
      name: string;
      url: string;
      category: string;
    }) => Promise<void>;
    onCancel: () => void;
  };

  let { onSubmit, onCancel }: Props = $props();

  let name = $state("");
  let url = $state("");
  let category = $state("");
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    submitting = true;
    error = null;
    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        category: category.trim(),
      });
      name = "";
      url = "";
      category = "";
    } catch (e) {
      error = String(e);
    } finally {
      submitting = false;
    }
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

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">
          RSS URL <span class="text-error">*</span>
        </legend>
        <input
          type="url"
          class="input input-bordered w-full"
          bind:value={url}
          placeholder="https://example.com/feed.xml"
          aria-label="RSS URL"
        />
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">名前</legend>
        <input
          type="text"
          class="input input-bordered w-full"
          bind:value={name}
          placeholder="省略時は URL を使用"
          aria-label="名前"
        />
      </fieldset>
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
        disabled={submitting || !url.trim()}
      >
        {submitting ? "登録中..." : "登録"}
      </button>
      <button class="btn btn-ghost" onclick={onCancel}>
        キャンセル
      </button>
    </div>
  </div>
</div>
