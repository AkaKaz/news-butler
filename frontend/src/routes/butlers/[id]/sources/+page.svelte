<script lang="ts">
  import {
    getSourcesByButler,
    createSource,
    updateSource,
    toggleSource,
    deleteSource,
    fetchFeedMeta,
  } from "$lib/firestore";
  import type { Source } from "$lib/types";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let sources = $state<Source[]>([]);
  let loading = $state(true);

  // Modal state
  let showModal = $state(false);
  let editingSource = $state<Source | null>(null);
  let formName = $state("");
  let formUrl = $state("");
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let fetchingMeta = $state(false);
  let urlError = $state<string | null>(null);

  // Per-row action states
  let togglingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);

  async function loadSources() {
    loading = true;
    try {
      sources = await getSourcesByButler(data.butler.id);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadSources();
  });

  function openCreate() {
    editingSource = null;
    formName = "";
    formUrl = "";
    saveError = null;
    urlError = null;
    showModal = true;
  }

  function openEdit(src: Source) {
    editingSource = src;
    formName = src.name;
    formUrl = src.url;
    saveError = null;
    urlError = null;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function onUrlBlur() {
    const url = formUrl.trim();
    if (!url) return;
    // 編集時でURLが変わっていなければスキップ
    if (editingSource && url === editingSource.url) return;
    fetchingMeta = true;
    urlError = null;
    try {
      const meta = await fetchFeedMeta(url);
      if (!formName.trim() && meta.title) formName = meta.title;
    } catch (e) {
      urlError = e instanceof Error ? e.message : "URLが無効です";
    } finally {
      fetchingMeta = false;
    }
  }

  async function save() {
    const name = formName.trim();
    const url = formUrl.trim();
    if (!name || !url) return;
    saving = true;
    saveError = null;
    try {
      if (editingSource) {
        await updateSource(editingSource.id, { name, url });
        sources = sources.map((s) =>
          s.id === editingSource!.id ? { ...s, name, url } : s
        );
      } else {
        const created = await createSource(data.butler.id, {
          name,
          url,
          category: "",
          tags: [],
        });
        sources = [created, ...sources];
      }
      closeModal();
    } catch (e) {
      saveError = e instanceof Error ? e.message : "保存に失敗しました";
    } finally {
      saving = false;
    }
  }

  async function toggle(src: Source) {
    if (togglingId) return;
    togglingId = src.id;
    try {
      await toggleSource(src.id, !src.isActive);
      sources = sources.map((s) =>
        s.id === src.id ? { ...s, isActive: !s.isActive } : s
      );
    } finally {
      togglingId = null;
    }
  }

  async function confirmDelete(id: string) {
    if (deletingId) return;
    deletingId = id;
    confirmDeleteId = null;
    try {
      await deleteSource(id);
      sources = sources.filter((s) => s.id !== id);
    } finally {
      deletingId = null;
    }
  }

  function formatLastFetched(
    ts: { seconds: number; nanoseconds: number } | null
  ): string {
    if (!ts) return "未取得";
    const diff = Date.now() / 1000 - ts.seconds;
    if (diff < 60) return "たった今";
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  }
</script>

<!-- ── Page header ─────────────────────────────────────────────────────────── -->
<div class="px-4 lg:px-6 pt-16 pb-4">
  <h2 class="text-base font-bold tracking-tight">ニュースソース</h2>
  <p class="text-xs text-base-content/50 mt-0.5">{data.butler.name}</p>
</div>

<!-- ── Source list ─────────────────────────────────────────────────────────── -->
<div class="px-4 lg:px-6 pb-10">
  {#if loading}
    <div class="flex flex-col gap-3">
      {#each [1, 2, 3] as _}
        <div class="skeleton h-20 w-full rounded-2xl"></div>
      {/each}
    </div>

  {:else if sources.length === 0}
    <button
      type="button"
      class="w-full flex flex-col items-center justify-center gap-2 py-12
             rounded-2xl border-2 border-dashed border-base-200
             text-base-content/40 hover:border-primary/30 hover:text-primary
             transition-all"
      onclick={openCreate}
    >
      <svg
        class="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87
             0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0
             .75.75 0 011.5 0z"
        />
      </svg>
      <span class="text-sm font-medium">ニュースソースを追加</span>
      <span class="text-xs">RSSフィードのURLを登録します</span>
    </button>

  {:else}
    <div class="flex flex-col gap-2">
      {#each sources as src (src.id)}
        {@const hasError = src.consecutiveErrors >= 3}
        {@const isDeleting = deletingId === src.id}
        {@const isToggling = togglingId === src.id}

        <div
          class="rounded-2xl bg-base-100 border border-base-200
                 transition-opacity duration-200"
          class:opacity-40={isDeleting}
        >
          <div class="flex items-center gap-3 px-4 py-3">
            <!-- Status dot -->
            <span
              class="w-2 h-2 rounded-full shrink-0 mt-0.5 {hasError
                ? 'bg-error'
                : src.isActive
                  ? 'bg-success'
                  : 'bg-base-content/25'}"
            ></span>

            <!-- Name + URL -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-snug truncate">
                {src.name}
              </p>
              <p class="text-xs text-base-content/45 truncate mt-0.5">
                {src.url}
              </p>
              <div class="flex items-center gap-2 mt-1">
                {#if hasError}
                  <span class="badge badge-error badge-xs">エラー</span>
                {/if}
                <span class="text-xs text-base-content/35">
                  {formatLastFetched(src.lastFetchedAt)}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <!-- Toggle -->
              {#if isToggling}
                <span
                  class="w-8 h-8 flex items-center justify-center"
                >
                  <span
                    class="loading loading-spinner loading-xs
                           text-base-content/40"
                  ></span>
                </span>
              {:else}
                <input
                  type="checkbox"
                  class="toggle toggle-success toggle-sm"
                  checked={src.isActive}
                  onchange={() => toggle(src)}
                  aria-label={src.isActive ? "有効" : "無効"}
                />
              {/if}

              <!-- Edit -->
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle
                       text-base-content/40 hover:text-base-content"
                onclick={() => openEdit(src)}
                aria-label="編集"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0
                       112.652 2.652L10.582 16.07a4.5 4.5 0
                       01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0
                       011.13-1.897l8.932-8.931z"
                  />
                </svg>
              </button>

              <!-- Delete -->
              {#if confirmDeleteId === src.id}
                <button
                  type="button"
                  class="btn btn-error btn-sm rounded-full text-xs
                         px-3 h-8 min-h-0"
                  disabled={isDeleting}
                  onclick={() => confirmDelete(src.id)}
                >
                  {#if isDeleting}
                    <span class="loading loading-spinner loading-xs"></span>
                  {:else}
                    削除確認
                  {/if}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle
                         text-base-content/40"
                  onclick={() => (confirmDeleteId = null)}
                  aria-label="キャンセル"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              {:else}
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle
                         text-base-content/40 hover:text-error"
                  onclick={() => (confirmDeleteId = src.id)}
                  aria-label="削除"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21
                         c.342.052.682.107 1.022.166m-1.022-.165L18.16
                         19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25
                         2.25 0 01-2.244-2.077L4.772 5.79m14.456
                         0a48.108 48.108 0 00-3.478-.397m-12
                         .562c.34-.059.68-.114 1.022-.165m0 0a48.11
                         48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91
                         -2.164-2.09-2.201a51.964 51.964 0
                         00-3.32 0c-1.18.037-2.09 1.022-2.09
                         2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Add / Edit Modal ───────────────────────────────────────────────────── -->
{#if showModal}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={closeModal}
    onkeydown={(e) => e.key === "Escape" && closeModal()}
  ></div>

  <!-- Sheet / Dialog -->
  <div
    class="fixed z-50 bg-base-100 shadow-xl
           inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe
           lg:inset-auto lg:top-1/2 lg:left-1/2
           lg:-translate-x-1/2 lg:-translate-y-1/2
           lg:rounded-2xl lg:w-[420px]"
    role="dialog"
    aria-modal="true"
    aria-label={editingSource ? "ニュースソースを編集" : "ニュースソースを追加"}
  >
    <!-- Pull handle (mobile only) -->
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden">
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 mb-5">
      <h3 class="font-bold text-lg">
        {editingSource ? "ニュースソースを編集" : "ニュースソースを追加"}
      </h3>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        onclick={closeModal}
        aria-label="閉じる"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <form
      class="px-5 pb-6 flex flex-col gap-3"
      onsubmit={(e) => { e.preventDefault(); save(); }}
    >
      <!-- URL field (first) -->
      <label class="form-control">
        <div class="label pb-1">
          <span class="label-text text-sm font-medium">
            RSS / Atom フィード URL <span class="text-error">*</span>
          </span>
        </div>
        <div class="relative">
          <input
            type="url"
            class="input input-bordered rounded-full px-4 font-mono text-sm w-full
                   {urlError ? 'input-error' : ''}"
            placeholder="https://example.com/feed"
            bind:value={formUrl}
            onblur={onUrlBlur}
            required
            autofocus
          />
          {#if fetchingMeta}
            <span class="absolute right-4 top-1/2 -translate-y-1/2">
              <span class="loading loading-spinner loading-xs text-base-content/40"></span>
            </span>
          {/if}
        </div>
        {#if urlError}
          <div class="label pt-1">
            <span class="label-text-alt text-error">{urlError}</span>
          </div>
        {/if}
      </label>

      <!-- Name field (second, auto-populated) -->
      <label class="form-control">
        <div class="label pb-1">
          <span class="label-text text-sm font-medium">
            名前 <span class="text-error">*</span>
          </span>
        </div>
        <input
          type="text"
          class="input input-bordered rounded-full px-4"
          placeholder="例: TechCrunch Japan"
          bind:value={formName}
          required
        />
      </label>

      {#if saveError}
        <div class="alert alert-error py-2 text-sm">
          <svg
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374
                 1.948 3.374h14.71c1.73 0 2.813-1.874
                 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898
                 0L2.697 16.126z"
            />
          </svg>
          <span>{saveError}</span>
        </div>
      {/if}

      <button
        type="submit"
        class="btn btn-primary rounded-full w-full mt-1"
        disabled={saving || fetchingMeta || !formName.trim() || !formUrl.trim()}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          {editingSource ? "保存" : "追加"}
        {/if}
      </button>
    </form>
  </div>
{/if}
