<script lang="ts">
  import { formatDate, statusBadge, type Source } from "$lib/utils/sources";

  type SaveData = {
    name: string;
    category: string;
    fetchIntervalMinutes: number;
  };

  type Props = {
    source: Source;
    onToggle: () => void;
    onSave: (data: SaveData) => Promise<void>;
    onDelete: () => void;
  };

  let { source, onToggle, onSave, onDelete }: Props = $props();

  let editing = $state(false);
  let editName = $state("");
  let editCategory = $state("");
  let editInterval = $state(60);
  let saving = $state(false);

  function startEdit() {
    editName = source.name;
    editCategory = source.category ?? "";
    editInterval = source.fetchIntervalMinutes;
    editing = true;
  }

  async function handleSave() {
    saving = true;
    try {
      await onSave({
        name: editName.trim(),
        category: editCategory.trim(),
        fetchIntervalMinutes: editInterval,
      });
      editing = false;
    } finally {
      saving = false;
    }
  }

  function handleDelete() {
    if (!confirm(`「${source.name}」を削除しますか？`)) return;
    onDelete();
  }

  const badge = $derived(statusBadge(source));
</script>

<tr class={source.isActive ? "" : "opacity-50"}>
  {#if editing}
    <td colspan="2">
      <div class="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          class="input input-bordered input-sm w-36"
          bind:value={editName}
          placeholder="名前"
          aria-label="名前"
        />
        <input
          type="text"
          class="input input-bordered input-sm w-28"
          bind:value={editCategory}
          placeholder="カテゴリ"
          aria-label="カテゴリ"
        />
        <label class="flex items-center gap-1 text-sm">
          取得間隔
          <input
            type="number"
            class="input input-bordered input-sm w-16 text-right"
            bind:value={editInterval}
            min="5"
            max="1440"
            aria-label="取得間隔（分）"
          />
          分
        </label>
      </div>
    </td>
    <td>{formatDate(source.lastFetchedAt)}</td>
    <td>
      <span class="badge {badge.badgeClass}">{badge.label}</span>
    </td>
    <td>
      <div class="flex gap-1">
        <button
          class="btn btn-primary btn-xs"
          onclick={handleSave}
          disabled={saving}
        >
          保存
        </button>
        <button
          class="btn btn-ghost btn-xs"
          onclick={() => (editing = false)}
        >
          取消
        </button>
      </div>
    </td>
  {:else}
    <td>
      <div class="font-medium">{source.name}</div>
      <div class="text-xs text-base-content/50 break-all">{source.url}</div>
    </td>
    <td>{source.category || "—"}</td>
    <td class="text-sm">{formatDate(source.lastFetchedAt)}</td>
    <td>
      <span class="badge {badge.badgeClass}">{badge.label}</span>
    </td>
    <td>
      <div class="flex gap-1">
        <button
          class="btn btn-xs {source.isActive ? 'btn-warning' : 'btn-success'}"
          onclick={onToggle}
        >
          {source.isActive ? "無効化" : "有効化"}
        </button>
        <button class="btn btn-ghost btn-xs" onclick={startEdit}>
          編集
        </button>
        <button
          class="btn btn-error btn-outline btn-xs"
          onclick={handleDelete}
        >
          削除
        </button>
      </div>
    </td>
  {/if}
</tr>
