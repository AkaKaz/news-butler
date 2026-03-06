<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";

  type Source = {
    id: string;
    name: string;
    url: string;
    category: string;
    tags: string[];
    isActive: boolean;
    fetchIntervalMinutes: number;
    lastFetchedAt: string | null;
    consecutiveErrors: number;
  };

  let sources = $state<Source[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // 追加フォーム
  let showAddForm = $state(false);
  let addName = $state("");
  let addUrl = $state("");
  let addCategory = $state("");
  let addSubmitting = $state(false);
  let addError = $state<string | null>(null);

  // 編集
  let editingId = $state<string | null>(null);
  let editName = $state("");
  let editCategory = $state("");
  let editInterval = $state(60);
  let editSubmitting = $state(false);

  async function load() {
    try {
      sources = await api.get<Source[]>("/api/sources");
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function addSource() {
    if (!addUrl.trim()) return;
    addSubmitting = true;
    addError = null;
    try {
      await api.post("/api/sources", {
        name: addName.trim() || addUrl.trim(),
        url: addUrl.trim(),
        category: addCategory.trim(),
      });
      addName = "";
      addUrl = "";
      addCategory = "";
      showAddForm = false;
      await load();
    } catch (e) {
      addError = String(e);
    } finally {
      addSubmitting = false;
    }
  }

  function startEdit(source: Source) {
    editingId = source.id;
    editName = source.name;
    editCategory = source.category ?? "";
    editInterval = source.fetchIntervalMinutes;
  }

  async function saveEdit(id: string) {
    editSubmitting = true;
    try {
      await api.put(`/api/sources/${id}`, {
        name: editName.trim(),
        category: editCategory.trim(),
        fetchIntervalMinutes: editInterval,
      });
      editingId = null;
      await load();
    } finally {
      editSubmitting = false;
    }
  }

  async function toggle(id: string) {
    try {
      await api.post(`/api/sources/${id}/toggle`, {});
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  async function remove(source: Source) {
    if (!confirm(`「${source.name}」を削除しますか？`)) return;
    try {
      await api.delete(`/api/sources/${source.id}`);
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  function formatDate(ts: string | null): string {
    if (!ts) return "未取得";
    return new Date(ts).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusBadge(
    source: Source
  ): { label: string; class: string } {
    if (source.consecutiveErrors >= 3)
      return { label: "自動停止", class: "badge-error" };
    if (source.consecutiveErrors > 0)
      return {
        label: `エラー ${source.consecutiveErrors}`,
        class: "badge-warning",
      };
    if (source.isActive)
      return { label: "有効", class: "badge-success" };
    return { label: "無効", class: "badge-ghost" };
  }
</script>

<div class="flex flex-col gap-6">
  <!-- ヘッダー -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">ソース管理</h1>
    <button
      class="btn btn-primary"
      onclick={() => (showAddForm = !showAddForm)}
    >
      + ソースを追加
    </button>
  </div>

  <!-- 追加フォーム -->
  {#if showAddForm}
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body gap-4">
        <h2 class="card-title text-base">RSSソースを追加</h2>

        {#if addError}
          <div class="alert alert-error">
            <span>{addError}</span>
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
              bind:value={addUrl}
              placeholder="https://example.com/feed.xml"
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">名前</legend>
            <input
              type="text"
              class="input input-bordered w-full"
              bind:value={addName}
              placeholder="省略時は URL を使用"
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">カテゴリ</legend>
            <input
              type="text"
              class="input input-bordered w-full"
              bind:value={addCategory}
              placeholder="tech, news など"
            />
          </fieldset>
        </div>

        <div class="card-actions">
          <button
            class="btn btn-primary"
            onclick={addSource}
            disabled={addSubmitting || !addUrl.trim()}
          >
            {addSubmitting ? "登録中..." : "登録"}
          </button>
          <button
            class="btn btn-ghost"
            onclick={() => { showAddForm = false; addError = null; }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- 一覧 -->
  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">{error}</div>
  {:else if sources.length === 0}
    <div class="text-center py-16 text-base-content/50">
      ソースが登録されていません。
    </div>
  {:else}
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>名前 / URL</th>
            <th>カテゴリ</th>
            <th>最終取得</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {#each sources as source (source.id)}
            <tr class={source.isActive ? "" : "opacity-50"}>
              {#if editingId === source.id}
                <td colspan="2">
                  <div class="flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      class="input input-bordered input-sm w-36"
                      bind:value={editName}
                      placeholder="名前"
                    />
                    <input
                      type="text"
                      class="input input-bordered input-sm w-28"
                      bind:value={editCategory}
                      placeholder="カテゴリ"
                    />
                    <label class="flex items-center gap-1 text-sm">
                      取得間隔
                      <input
                        type="number"
                        class="input input-bordered input-sm w-16 text-right"
                        bind:value={editInterval}
                        min="5"
                        max="1440"
                      />
                      分
                    </label>
                  </div>
                </td>
                <td>{formatDate(source.lastFetchedAt)}</td>
                <td>
                  <span class="badge {statusBadge(source).class}">
                    {statusBadge(source).label}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button
                      class="btn btn-primary btn-xs"
                      onclick={() => saveEdit(source.id)}
                      disabled={editSubmitting}
                    >
                      保存
                    </button>
                    <button
                      class="btn btn-ghost btn-xs"
                      onclick={() => (editingId = null)}
                    >
                      取消
                    </button>
                  </div>
                </td>
              {:else}
                <td>
                  <div class="font-medium">{source.name}</div>
                  <div class="text-xs text-base-content/50 break-all">
                    {source.url}
                  </div>
                </td>
                <td>{source.category || "—"}</td>
                <td class="text-sm">{formatDate(source.lastFetchedAt)}</td>
                <td>
                  <span class="badge {statusBadge(source).class}">
                    {statusBadge(source).label}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button
                      class="btn btn-xs {source.isActive
                        ? 'btn-warning'
                        : 'btn-success'}"
                      onclick={() => toggle(source.id)}
                    >
                      {source.isActive ? "無効化" : "有効化"}
                    </button>
                    <button
                      class="btn btn-ghost btn-xs"
                      onclick={() => startEdit(source)}
                    >
                      編集
                    </button>
                    <button
                      class="btn btn-error btn-outline btn-xs"
                      onclick={() => remove(source)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
