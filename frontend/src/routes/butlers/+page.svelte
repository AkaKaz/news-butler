<script lang="ts">
  import { getButlers, createButler as fsCreateButler } from "$lib/firestore";
  import { ICON_EMOJIS, ICON_COLORS, randomIconColor } from "$lib/types";
  import type { Butler } from "$lib/types";

  let butlers = $state<Butler[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showCreateModal = $state(false);
  let creating = $state(false);

  // New butler form state
  let newName = $state("");
  let newDescription = $state("");
  let newEmoji = $state("🤖");
  let newColor = $state(randomIconColor());

  async function load() {
    try {
      butlers = await getButlers();
    } catch (e) {
      error = e instanceof Error ? e.message : "読み込みに失敗しました";
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    newName = "";
    newDescription = "";
    newEmoji = "🤖";
    newColor = randomIconColor();
    showCreateModal = true;
  }

  function closeCreate() {
    showCreateModal = false;
  }

  async function createButler() {
    if (!newName.trim()) return;
    creating = true;
    try {
      const created = await fsCreateButler({
        name: newName.trim(),
        description: newDescription.trim(),
        iconEmoji: newEmoji,
        iconColor: newColor,
      });
      butlers = [created, ...butlers];
      closeCreate();
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
      onclick={openCreate}
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
      新規作成
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-md text-primary loading-spinner"></span>
    </div>

  {:else if error}
    <div class="alert alert-error">
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <span>{error}</span>
    </div>

  {:else if butlers.length === 0}
    <div class="flex flex-col items-center justify-center py-24 gap-4 text-base-content/50">
      <div class="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center text-4xl">🤖</div>
      <div class="text-center">
        <p class="font-medium">AI執事がいません</p>
        <p class="text-sm mt-1">「新規作成」ボタンから追加してください</p>
      </div>
    </div>

  {:else}
    <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {#each butlers as butler (butler.id)}
        <a
          href="/butlers/{butler.id}"
          class="flex flex-col items-center gap-3 p-4 rounded-2xl bg-base-100 border border-base-200 hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer text-center"
        >
          <!-- Circular avatar -->
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-sm"
            style="background-color: {butler.iconColor}1a; border: 2.5px solid {butler.iconColor}40;"
          >
            <span style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));">{butler.iconEmoji}</span>
          </div>

          <!-- Name + badge -->
          <div class="flex flex-col items-center gap-1 min-w-0 w-full">
            <span class="font-semibold text-sm leading-snug text-base-content line-clamp-1 w-full">{butler.name}</span>
            {#if butler.description}
              <span class="text-xs text-base-content/55 line-clamp-2 w-full">{butler.description}</span>
            {/if}
            <span
              class="badge badge-xs mt-0.5"
              class:badge-success={butler.isActive}
              class:badge-ghost={!butler.isActive}
            >
              {butler.isActive ? "有効" : "無効"}
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<!-- 新規作成モーダル（モバイル: ボトムシート、デスクトップ: センター） -->
{#if showCreateModal}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={closeCreate}
    onkeydown={(e) => e.key === 'Escape' && closeCreate()}
  ></div>

  <!-- Sheet / Dialog -->
  <div class="fixed z-50 bg-base-100 shadow-xl
    inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe
    lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[420px]">

    <!-- Pull handle (mobile only) -->
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-5 lg:hidden"></div>

    <div class="px-5 pb-6">
      <h3 class="font-bold text-lg mb-5">AI執事を作成</h3>

      <!-- Avatar preview + picker -->
      <div class="flex flex-col items-center gap-4 mb-5">
        <!-- Preview -->
        <div
          class="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm"
          style="background-color: {newColor}1a; border: 3px solid {newColor}50;"
        >
          {newEmoji}
        </div>

        <!-- Emoji picker -->
        <div>
          <p class="text-xs text-base-content/50 text-center mb-2">アイコン</p>
          <div class="grid grid-cols-6 gap-1.5">
            {#each ICON_EMOJIS as emoji}
              <button
                type="button"
                class="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-100"
                class:ring-2={newEmoji === emoji}
                class:ring-primary={newEmoji === emoji}
                class:bg-base-200={newEmoji === emoji}
                onclick={() => (newEmoji = emoji)}
              >
                {emoji}
              </button>
            {/each}
          </div>
        </div>

        <!-- Color picker -->
        <div>
          <p class="text-xs text-base-content/50 text-center mb-2">カラー</p>
          <div class="grid grid-cols-6 gap-1.5">
            {#each ICON_COLORS as color}
              <button
                type="button"
                class="w-8 h-8 rounded-full transition-all duration-100 flex items-center justify-center"
                style="background-color: {color};"
                class:ring-2={newColor === color}
                class:ring-offset-2={newColor === color}
                onclick={() => (newColor = color)}
              >
                {#if newColor === color}
                  <svg class="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Form fields -->
      <form
        onsubmit={(e) => { e.preventDefault(); createButler(); }}
        class="flex flex-col gap-3"
      >
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm font-medium">名前 <span class="text-error">*</span></span></div>
          <input
            type="text"
            class="input input-bordered"
            placeholder="例: テクノロジーニュース"
            bind:value={newName}
            required
            autofocus
          />
        </label>
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm font-medium">説明</span></div>
          <textarea
            class="textarea textarea-bordered resize-none"
            rows="2"
            placeholder="このAI執事の役割や目的"
            bind:value={newDescription}
          ></textarea>
        </label>

        <div class="flex gap-2 mt-1">
          <button
            type="button"
            class="btn btn-ghost flex-1"
            onclick={closeCreate}
          >キャンセル</button>
          <button
            type="submit"
            class="btn btn-primary flex-1"
            disabled={creating || !newName.trim()}
          >
            {#if creating}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              作成
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
