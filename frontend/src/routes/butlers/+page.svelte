<script lang="ts">
  import { getButlers, createButler as fsCreateButler, updateButler, uploadButlerIcon } from "$lib/firestore";
  import { ICON_COLORS, randomIconColor } from "$lib/types";
  import type { Butler } from "$lib/types";

  let butlers = $state<Butler[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showCreateModal = $state(false);
  let creating = $state(false);

  // Form state
  let newName = $state("");
  let newDescription = $state("");
  let newColor = $state(randomIconColor());
  let iconFile = $state<File | null>(null);
  let iconPreviewUrl = $state<string | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

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
    newColor = randomIconColor();
    iconFile = null;
    if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl);
    iconPreviewUrl = null;
    showCreateModal = true;
  }

  function closeCreate() {
    showCreateModal = false;
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    iconFile = file;
    if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl);
    iconPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  async function createButler() {
    if (!newName.trim()) return;
    creating = true;
    try {
      const created = await fsCreateButler({
        name: newName.trim(),
        description: newDescription.trim(),
        iconUrl: null,
        iconColor: newColor,
      });
      if (iconFile) {
        const url = await uploadButlerIcon(created.id, iconFile);
        await updateButler(created.id, { iconUrl: url });
        created.iconUrl = url;
      }
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
  <div class="mb-6">
    <h1 class="text-2xl font-bold tracking-tight">AI執事</h1>
  </div>

  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

  {:else if error}
    <div class="alert alert-error">
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <span>{error}</span>
    </div>

  {:else}
    <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {#each butlers as butler (butler.id)}
        <a
          href="/butlers/{butler.id}"
          class="flex flex-col items-center gap-3 p-4 rounded-2xl bg-base-100 border border-base-200 hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer text-center"
        >
          <!-- Circular avatar -->
          {#if butler.iconUrl}
            <img
              src={butler.iconUrl}
              alt={butler.name}
              class="w-16 h-16 rounded-full object-cover shadow-sm border border-base-200"
            />
          {:else}
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center shadow-sm"
              style="background-color: {butler.iconColor}22; border: 2px solid {butler.iconColor}50;"
            >
              <svg class="w-8 h-8" style="color: {butler.iconColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.5"/>
                <circle cx="12" cy="2.5" r="0.5" fill="currentColor" stroke="none"/>
                <rect x="4" y="5.5" width="16" height="11" rx="2"/>
                <circle cx="9" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 14h6"/>
              </svg>
            </div>
          {/if}

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

      <!-- 新規作成カード（末尾） -->
      <button
        onclick={openCreate}
        class="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-base-300 hover:border-primary/50 hover:bg-base-100 transition-all duration-150 cursor-pointer text-center text-base-content/40 hover:text-primary"
      >
        <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <span class="font-semibold text-sm">新規作成</span>
      </button>
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
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden"></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 mb-5">
      <h3 class="font-bold text-lg">AI執事を作成</h3>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        onclick={closeCreate}
        aria-label="閉じる"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="px-5 pb-6">
      <!-- Avatar upload + color -->
      <div class="flex flex-col items-center gap-3 mb-5">
        <input
          bind:this={fileInputEl}
          type="file"
          accept="image/*"
          class="hidden"
          onchange={onFileChange}
        />
        <button
          type="button"
          class="relative group"
          onclick={() => fileInputEl?.click()}
          aria-label="アイコン画像を選択"
        >
          {#if iconPreviewUrl}
            <img
              src={iconPreviewUrl}
              alt="プレビュー"
              class="w-20 h-20 rounded-full object-cover shadow-md border-2 border-base-200 group-hover:opacity-80 transition-opacity"
            />
          {:else}
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center shadow-md group-hover:opacity-80 transition-opacity"
              style="background-color: {newColor}22; border: 2.5px solid {newColor}50;"
            >
              <svg class="w-9 h-9" style="color: {newColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.5"/>
                <circle cx="12" cy="2.5" r="0.5" fill="currentColor" stroke="none"/>
                <rect x="4" y="5.5" width="16" height="11" rx="2"/>
                <circle cx="9" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 14h6"/>
              </svg>
            </div>
          {/if}
          <!-- Upload overlay -->
          <span class="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-base-100 border border-base-200 shadow-sm flex items-center justify-center text-base-content/70 group-hover:text-primary transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
          </span>
        </button>
        <p class="text-xs text-base-content/40">タップして画像を選択</p>

        <!-- Color picker -->
        <div class="w-full">
          <p class="text-xs text-base-content/50 text-center mb-2">背景カラー</p>
          <div class="flex flex-wrap justify-center gap-2">
            {#each ICON_COLORS as color}
              <button
                type="button"
                class="w-7 h-7 rounded-full transition-all duration-100 flex items-center justify-center shrink-0"
                style="background-color: {color};"
                class:ring-2={newColor === color}
                class:ring-offset-2={newColor === color}
                class:ring-base-content={newColor === color}
                onclick={() => (newColor = color)}
                aria-label="カラー {color}"
              >
                {#if newColor === color}
                  <svg class="w-3.5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
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

        <button
          type="submit"
          class="btn btn-primary w-full mt-1"
          disabled={creating || !newName.trim()}
        >
          {#if creating}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            作成
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
