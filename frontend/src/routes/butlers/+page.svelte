<script lang="ts">
  import { getButlers, createButler as fsCreateButler } from "$lib/firestore";
  import type { Butler } from "$lib/types";

  let butlers = $state<Butler[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showCreateModal = $state(false);
  let creating = $state(false);
  let newName = $state("");
  let newDescription = $state("");

  async function load() {
    try {
      butlers = await getButlers();
    } catch (e) {
      error = e instanceof Error ? e.message : "読み込みに失敗しました";
    } finally {
      loading = false;
    }
  }

  async function createButler() {
    if (!newName.trim()) return;
    creating = true;
    try {
      const created = await fsCreateButler({
        name: newName.trim(),
        description: newDescription.trim(),
      });
      butlers = [created, ...butlers];
      showCreateModal = false;
      newName = "";
      newDescription = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "作成に失敗しました";
    } finally {
      creating = false;
    }
  }

  $effect(() => {
    load();
  });
</script>

<div class="p-4 lg:p-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold tracking-tight">AI執事</h1>
    <button
      class="btn btn-primary btn-sm gap-1.5"
      onclick={() => (showCreateModal = true)}
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
      新規作成
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

  {:else if error}
    <div class="alert alert-error">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <span>{error}</span>
    </div>

  {:else if butlers.length === 0}
    <div class="flex flex-col items-center justify-center py-24 gap-4 text-base-content/50">
      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.5"/>
        <circle cx="12" cy="2.5" r="0.5" fill="currentColor" stroke="none"/>
        <rect x="4" y="5.5" width="16" height="11" rx="2"/>
        <circle cx="9" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 14h6"/>
      </svg>
      <div class="text-center">
        <p class="font-medium">AI執事がいません</p>
        <p class="text-sm mt-1">「新規作成」ボタンから追加してください</p>
      </div>
    </div>

  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each butlers as butler (butler.id)}
        <a
          href="/butlers/{butler.id}"
          class="card card-bordered bg-base-100 hover:shadow-md hover:border-primary/30 transition-all duration-150 cursor-pointer"
        >
          <div class="card-body p-4 gap-2">
            <div class="flex items-start justify-between gap-2">
              <h2 class="card-title text-base font-semibold leading-snug">{butler.name}</h2>
              <span class="badge badge-sm shrink-0" class:badge-success={butler.isActive} class:badge-ghost={!butler.isActive}>
                {butler.isActive ? "有効" : "無効"}
              </span>
            </div>

            {#if butler.description}
              <p class="text-sm text-base-content/60 line-clamp-2">{butler.description}</p>
            {/if}

            {#if butler.keywords.length > 0}
              <div class="flex flex-wrap gap-1 mt-1">
                {#each butler.keywords.slice(0, 4) as kw}
                  <span class="badge badge-outline badge-xs">{kw}</span>
                {/each}
                {#if butler.keywords.length > 4}
                  <span class="badge badge-ghost badge-xs">+{butler.keywords.length - 4}</span>
                {/if}
              </div>
            {/if}

            <div class="text-xs text-base-content/40 mt-1 flex items-center gap-1.5">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1"/>
              </svg>
              {butler.sourceIds.length === 0 ? "全ソース" : `${butler.sourceIds.length} ソース`}
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<!-- 新規作成モーダル -->
{#if showCreateModal}
  <dialog class="modal modal-open">
    <div class="modal-box max-w-sm">
      <h3 class="font-bold text-lg mb-4">AI執事を作成</h3>
      <form
        onsubmit={(e) => { e.preventDefault(); createButler(); }}
        class="flex flex-col gap-3"
      >
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm">名前 <span class="text-error">*</span></span></div>
          <input
            type="text"
            class="input input-bordered input-sm"
            placeholder="例: テクノロジーニュース"
            bind:value={newName}
            required
          />
        </label>
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm">説明</span></div>
          <textarea
            class="textarea textarea-bordered textarea-sm resize-none"
            rows="2"
            placeholder="このAI執事の役割や目的"
            bind:value={newDescription}
          ></textarea>
        </label>
        <div class="modal-action mt-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onclick={() => { showCreateModal = false; newName = ""; newDescription = ""; }}
          >キャンセル</button>
          <button
            type="submit"
            class="btn btn-primary btn-sm"
            disabled={creating || !newName.trim()}
          >
            {#if creating}
              <span class="loading loading-spinner loading-xs"></span>
            {/if}
            作成
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button onclick={() => { showCreateModal = false; newName = ""; newDescription = ""; }}>close</button>
    </form>
  </dialog>
{/if}
