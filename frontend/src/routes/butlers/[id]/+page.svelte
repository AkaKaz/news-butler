<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    getSourcesByButler,
    getDigestConfigs,
    updateButler,
  } from "$lib/firestore";
  import { ICON_EMOJIS, ICON_COLORS } from "$lib/types";
  import type { Butler, Source, DigestConfig } from "$lib/types";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Butler reactive copy (for local edits)
  let butler = $state<Butler>({ ...data.butler });

  // Sub-data
  let sources = $state<Source[]>([]);
  let digestConfigs = $state<DigestConfig[]>([]);
  let loadingData = $state(true);

  // Inline edit state
  let editingName = $state(false);
  let editingDesc = $state(false);
  let editName = $state("");
  let editDesc = $state("");
  let saving = $state(false);

  // Icon picker modal
  let showIconPicker = $state(false);
  let pickerEmoji = $state(butler.iconEmoji);
  let pickerColor = $state(butler.iconColor);

  // Source overflow detection
  let badgeContainerEl: HTMLDivElement | null = null;
  let hiddenSourceCount = $state(0);
  let measuredSources = $state(false);

  async function loadData() {
    const butlerId = butler.id;
    try {
      const [s, dc] = await Promise.all([
        getSourcesByButler(butlerId),
        getDigestConfigs(butlerId),
      ]);
      sources = s;
      digestConfigs = dc;
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    loadData();
  });

  // Measure source badge overflow after render
  $effect(() => {
    if (loadingData || !badgeContainerEl || sources.length === 0) return;
    // Re-measure after DOM updates
    requestAnimationFrame(() => {
      if (!badgeContainerEl) return;
      const items = badgeContainerEl.querySelectorAll<HTMLElement>("[data-source-badge]");
      if (items.length === 0) return;
      const firstTop = items[0].offsetTop;
      const rowH = items[0].offsetHeight;
      const maxTop = firstTop + rowH * 2 - 1;
      let hidden = 0;
      items.forEach((el) => {
        if (el.offsetTop > maxTop) {
          el.style.display = "none";
          hidden++;
        } else {
          el.style.display = "";
        }
      });
      hiddenSourceCount = hidden;
      measuredSources = true;
    });
  });

  // ── Inline edit: Name ─────────────────────────────────────────────────────

  function startEditName() {
    editName = butler.name;
    editingName = true;
  }

  async function saveName() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === butler.name) { cancelEditName(); return; }
    saving = true;
    try {
      await updateButler(butler.id, { name: trimmed });
      butler = { ...butler, name: trimmed };
    } finally {
      saving = false;
      editingName = false;
    }
  }

  function cancelEditName() {
    editingName = false;
  }

  // ── Inline edit: Description ──────────────────────────────────────────────

  function startEditDesc() {
    editDesc = butler.description;
    editingDesc = true;
  }

  async function saveDesc() {
    const trimmed = editDesc.trim();
    saving = true;
    try {
      await updateButler(butler.id, { description: trimmed });
      butler = { ...butler, description: trimmed };
    } finally {
      saving = false;
      editingDesc = false;
    }
  }

  function cancelEditDesc() {
    editingDesc = false;
  }

  // ── Icon picker ───────────────────────────────────────────────────────────

  function openIconPicker() {
    pickerEmoji = butler.iconEmoji;
    pickerColor = butler.iconColor;
    showIconPicker = true;
  }

  async function saveIcon() {
    saving = true;
    try {
      await updateButler(butler.id, { iconEmoji: pickerEmoji, iconColor: pickerColor });
      butler = { ...butler, iconEmoji: pickerEmoji, iconColor: pickerColor };
    } finally {
      saving = false;
      showIconPicker = false;
    }
  }

  // ── Cron label helper ─────────────────────────────────────────────────────

  function cronLabel(schedule: string | null): string {
    if (!schedule) return "手動のみ";
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return schedule;
    const [min, hour, , , dow] = parts;
    const h = hour.padStart(2, "0");
    const m = min.padStart(2, "0");
    const time = `${h}:${m}`;
    if (dow === "*") return `毎日 ${time}`;
    const days: Record<string, string> = { "0": "日", "1": "月", "2": "火", "3": "水", "4": "木", "5": "金", "6": "土" };
    return `毎週${days[dow] ?? dow}曜 ${time}`;
  }

  function periodLabel(hours: number): string {
    if (hours < 24) return `${hours}時間分`;
    if (hours === 24) return "24時間分";
    const days = hours / 24;
    return `${days}日間分`;
  }
</script>

<div class="pb-10">
  <!-- ── Avatar section ──────────────────────────────────────────────────── -->
  <div class="flex flex-col items-center gap-3 pt-8 pb-6 px-4">
    <!-- Clickable avatar -->
    <button
      type="button"
      class="relative group"
      onclick={openIconPicker}
      aria-label="アイコンを変更"
    >
      <div
        class="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-md transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        style="background-color: {butler.iconColor}22; border: 3px solid {butler.iconColor}60;"
      >
        {butler.iconEmoji}
      </div>
      <!-- Edit overlay -->
      <span class="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-base-100 border border-base-200 shadow-sm flex items-center justify-center text-base-content/70 group-hover:text-primary transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        </svg>
      </span>
    </button>

    <!-- Name with inline edit -->
    <div class="flex items-center gap-2 w-full max-w-sm justify-center">
      {#if editingName}
        <input
          type="text"
          class="input input-bordered input-sm text-center font-bold text-lg flex-1"
          bind:value={editName}
          onkeydown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
          autofocus
        />
        <button class="btn btn-primary btn-sm btn-circle" onclick={saveName} disabled={saving} aria-label="保存">
          {#if saving}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          {/if}
        </button>
        <button class="btn btn-ghost btn-sm btn-circle" onclick={cancelEditName} aria-label="キャンセル">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      {:else}
        <h2 class="text-xl font-bold tracking-tight">{butler.name}</h2>
        <button
          class="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary"
          onclick={startEditName}
          aria-label="名前を編集"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>
      {/if}
    </div>

    <!-- Description with inline edit -->
    <div class="w-full max-w-sm">
      {#if editingDesc}
        <textarea
          class="textarea textarea-bordered w-full text-sm resize-none text-center"
          rows="2"
          bind:value={editDesc}
          onkeydown={(e) => { if (e.key === 'Escape') cancelEditDesc(); }}
          autofocus
        ></textarea>
        <div class="flex gap-2 mt-1.5 justify-center">
          <button class="btn btn-ghost btn-xs" onclick={cancelEditDesc}>キャンセル</button>
          <button class="btn btn-primary btn-xs" onclick={saveDesc} disabled={saving}>
            {#if saving}<span class="loading loading-spinner loading-xs"></span>{:else}保存{/if}
          </button>
        </div>
      {:else}
        <button
          type="button"
          class="group flex items-start justify-center gap-1.5 w-full text-sm text-base-content/60 hover:text-base-content transition-colors text-center"
          onclick={startEditDesc}
        >
          <span class={butler.description ? "" : "italic"}>
            {butler.description || "説明を追加..."}
          </span>
          <svg class="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- ── News Sources section ───────────────────────────────────────────── -->
  <div class="px-4 lg:px-6 mb-5">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">ニュースソース</span>
      <a
        href="/butlers/{butler.id}/sources"
        class="flex items-center gap-0.5 text-xs text-primary hover:underline"
        aria-label="ソース管理"
      >
        管理
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>

    {#if loadingData}
      <div class="flex gap-2">
        <div class="skeleton h-6 w-24 rounded-full"></div>
        <div class="skeleton h-6 w-20 rounded-full"></div>
        <div class="skeleton h-6 w-28 rounded-full"></div>
      </div>
    {:else if sources.length === 0}
      <a
        href="/butlers/{butler.id}/sources"
        class="text-sm text-base-content/40 hover:text-primary transition-colors"
      >
        ソースを追加 →
      </a>
    {:else}
      <div class="relative">
        <div bind:this={badgeContainerEl} class="flex flex-wrap gap-1.5 overflow-hidden" style="max-height: 72px;">
          {#each sources as src (src.id)}
            <span
              data-source-badge
              class="badge badge-outline badge-sm gap-1 transition-none"
              class:opacity-50={!src.isActive}
            >
              {#if !src.isActive}
                <span class="w-1.5 h-1.5 rounded-full bg-base-content/30"></span>
              {:else}
                <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
              {/if}
              {src.name}
            </span>
          {/each}
        </div>
        {#if hiddenSourceCount > 0}
          <span class="text-xs text-base-content/50 mt-1 block">+{hiddenSourceCount} 他</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ── Divider ────────────────────────────────────────────────────────── -->
  <div class="px-4 lg:px-6 mb-5">
    <hr class="border-base-200" />
  </div>

  <!-- ── Digest Configs (Report settings) ──────────────────────────────── -->
  <div class="px-4 lg:px-6">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">レポート設定</span>
      <a
        href="/butlers/{butler.id}/reports"
        class="flex items-center gap-0.5 text-xs text-primary hover:underline"
      >
        管理
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>

    {#if loadingData}
      <div class="flex flex-col gap-3">
        <div class="skeleton h-24 w-full rounded-2xl"></div>
        <div class="skeleton h-24 w-full rounded-2xl"></div>
      </div>
    {:else if digestConfigs.length === 0}
      <a
        href="/butlers/{butler.id}/reports"
        class="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-base-200 text-base-content/40 hover:border-primary/30 hover:text-primary transition-all"
      >
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="text-sm">レポート設定を追加</span>
      </a>
    {:else}
      <div class="flex flex-col gap-3">
        {#each digestConfigs as dc (dc.id)}
          <a
            href="/butlers/{butler.id}/reports/{dc.id}"
            class="group rounded-2xl bg-base-100 border border-base-200 overflow-hidden hover:border-base-300 hover:shadow-sm transition-all duration-150"
          >
            <!-- Accent color stripe -->
            <div class="h-1.5 w-full" style="background-color: {dc.accentColor};"></div>

            <div class="p-4 flex gap-3">
              <!-- Color swatch -->
              <div
                class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm"
                style="background-color: {dc.accentColor}22; border: 1.5px solid {dc.accentColor}40;"
              >
                <svg class="w-5 h-5" style="color: {dc.accentColor};" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm leading-snug text-base-content">{dc.name}</p>
                {#if dc.description}
                  <p class="text-xs text-base-content/55 mt-0.5 line-clamp-2">{dc.description}</p>
                {/if}
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="badge badge-xs badge-ghost">{cronLabel(dc.schedule)}</span>
                  <span class="badge badge-xs badge-ghost">{periodLabel(dc.periodHours)}</span>
                </div>
              </div>

              <svg class="w-4 h-4 text-base-content/30 group-hover:text-base-content/60 self-center shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ── Icon picker modal ─────────────────────────────────────────────────── -->
{#if showIconPicker}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={() => (showIconPicker = false)}
    onkeydown={(e) => e.key === 'Escape' && (showIconPicker = false)}
  ></div>

  <!-- Sheet / Dialog -->
  <div class="fixed z-50 bg-base-100 shadow-xl
    inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe
    lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[400px]">

    <!-- Pull handle (mobile only) -->
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-5 lg:hidden"></div>

    <div class="px-5 pb-6">
      <h3 class="font-bold text-base mb-4 text-center">アイコンを変更</h3>

      <!-- Preview -->
      <div class="flex justify-center mb-5">
        <div
          class="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md"
          style="background-color: {pickerColor}22; border: 3px solid {pickerColor}60;"
        >
          {pickerEmoji}
        </div>
      </div>

      <!-- Emoji grid -->
      <p class="text-xs text-base-content/50 text-center mb-2">アイコン</p>
      <div class="grid grid-cols-6 gap-1.5 mb-4">
        {#each ICON_EMOJIS as emoji}
          <button
            type="button"
            class="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-100"
            class:ring-2={pickerEmoji === emoji}
            class:ring-primary={pickerEmoji === emoji}
            class:bg-base-200={pickerEmoji === emoji}
            onclick={() => (pickerEmoji = emoji)}
          >
            {emoji}
          </button>
        {/each}
      </div>

      <!-- Color grid -->
      <p class="text-xs text-base-content/50 text-center mb-2">カラー</p>
      <div class="grid grid-cols-6 gap-1.5 mb-5">
        {#each ICON_COLORS as color}
          <button
            type="button"
            class="w-8 h-8 rounded-full mx-auto transition-all duration-100 flex items-center justify-center"
            style="background-color: {color};"
            class:ring-2={pickerColor === color}
            class:ring-offset-2={pickerColor === color}
            onclick={() => (pickerColor = color)}
          >
            {#if pickerColor === color}
              <svg class="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button class="btn btn-ghost flex-1" onclick={() => (showIconPicker = false)}>キャンセル</button>
        <button class="btn btn-primary flex-1" onclick={saveIcon} disabled={saving}>
          {#if saving}<span class="loading loading-spinner loading-sm"></span>{:else}保存{/if}
        </button>
      </div>
    </div>
  </div>
{/if}
