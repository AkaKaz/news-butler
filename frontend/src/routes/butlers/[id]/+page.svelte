<script lang="ts">
  import {
    getSourcesByButler,
    getDigestConfigs,
    updateButler,
    uploadButlerIcon,
    deleteButler,
    createDigestConfig,
    updateDigestConfig,
    toggleDigestConfig,
    deleteDigestConfig,
  } from "$lib/firestore";
  import { goto } from "$app/navigation";
  import { ICON_COLORS } from "$lib/types";
  import type { Butler, Source, DigestConfig } from "$lib/types";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let butler = $state<Butler>({ ...data.butler });

  // Sub-data
  let sources = $state<Source[]>([]);
  let digestConfigs = $state<DigestConfig[]>([]);
  let loadingData = $state(true);

  // Delete state
  let showDeleteModal = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function execDelete() {
    deleting = true;
    deleteError = null;
    try {
      await deleteButler(butler.id);
      await goto("/butlers");
    } catch (e) {
      deleteError = e instanceof Error ? e.message : "削除に失敗しました";
      deleting = false;
    }
  }

  // Edit modal state
  let showEditModal = $state(false);
  let editName = $state("");
  let editDescription = $state("");
  let editColor = $state("");
  let editIconFile = $state<File | null>(null);
  let editIconPreviewUrl = $state<string | null>(null);
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  // Source overflow detection
  let badgeContainerEl = $state<HTMLDivElement | null>(null);
  let hiddenSourceCount = $state(0);

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
    });
  });

  function openEdit() {
    editName = butler.name;
    editDescription = butler.description;
    editColor = butler.iconColor;
    editIconFile = null;
    if (editIconPreviewUrl) URL.revokeObjectURL(editIconPreviewUrl);
    editIconPreviewUrl = null;
    saveError = null;
    showEditModal = true;
  }

  function closeEdit() {
    showEditModal = false;
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    editIconFile = file;
    if (editIconPreviewUrl) URL.revokeObjectURL(editIconPreviewUrl);
    editIconPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  async function saveEdit() {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    saving = true;
    saveError = null;
    try {
      const updates: Partial<Butler> = {
        name: trimmedName,
        description: editDescription.trim(),
        iconColor: editColor,
      };
      if (editIconFile) {
        const url = await uploadButlerIcon(butler.id, editIconFile);
        updates.iconUrl = url;
      }
      await updateButler(butler.id, updates);
      butler = { ...butler, ...updates };
      closeEdit();
    } catch (e) {
      saveError = e instanceof Error ? e.message : "保存に失敗しました";
    } finally {
      saving = false;
    }
  }

  // ── Schedule helpers ────────────────────────────────────────────────────────
  type ScheduleFreq = "none" | "daily" | "weekly" | "monthly";

  function cronToForm(cron: string | null): { freq: ScheduleFreq; dow: number; dom: number } {
    if (!cron) return { freq: "none", dow: 1, dom: 1 };
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return { freq: "none", dow: 1, dom: 1 };
    const [, , dom, , dow] = parts;
    if (dom !== "*") return { freq: "monthly", dow: 1, dom: parseInt(dom) || 1 };
    if (dow !== "*") return { freq: "weekly", dow: parseInt(dow) ?? 1, dom: 1 };
    return { freq: "daily", dow: 1, dom: 1 };
  }

  function formToCron(freq: ScheduleFreq, dow: number, dom: number): string | null {
    if (freq === "none") return null;
    if (freq === "daily") return "0 0 * * *";
    if (freq === "weekly") return `0 0 * * ${dow}`;
    return `0 0 ${dom} * *`;
  }

  function freqToPeriodHours(freq: ScheduleFreq): number {
    if (freq === "weekly") return 168;
    if (freq === "monthly") return 720;
    return 24;
  }

  function cronLabel(schedule: string | null): string {
    if (!schedule) return "手動のみ";
    const { freq, dow, dom } = cronToForm(schedule);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    if (freq === "daily") return "毎日 0:00";
    if (freq === "weekly") return `毎週${days[dow] ?? ""}曜 0:00`;
    if (freq === "monthly") return `毎月${dom}日 0:00`;
    return schedule;
  }

  // ── DigestConfig modal state ─────────────────────────────────────────────────
  let showConfigModal = $state(false);
  let editingConfig = $state<DigestConfig | null>(null);
  let cfgName = $state("");
  let cfgDescription = $state("");
  let cfgFreq = $state<ScheduleFreq>("none");
  let cfgDow = $state(1);
  let cfgDom = $state(1);
  let cfgPrompt = $state("");
  let cfgAccentColor = $state(ICON_COLORS[0]);
  let cfgIsActive = $state(true);
  let savingCfg = $state(false);
  let saveConfigError = $state<string | null>(null);
  let confirmDeleteConfig = $state(false);
  let deletingCfg = $state(false);

  function openCreateConfig() {
    editingConfig = null;
    cfgName = "";
    cfgDescription = "";
    cfgFreq = "none";
    cfgDow = 1;
    cfgDom = 1;
    cfgPrompt = "";
    cfgAccentColor = ICON_COLORS[0];
    cfgIsActive = true;
    saveConfigError = null;
    confirmDeleteConfig = false;
    showConfigModal = true;
  }

  function openEditConfig(dc: DigestConfig) {
    editingConfig = dc;
    cfgName = dc.name;
    cfgDescription = dc.description;
    const parsed = cronToForm(dc.schedule);
    cfgFreq = parsed.freq;
    cfgDow = parsed.dow;
    cfgDom = parsed.dom;
    cfgPrompt = dc.promptTemplate;
    cfgAccentColor = dc.accentColor;
    cfgIsActive = dc.isActive;
    saveConfigError = null;
    confirmDeleteConfig = false;
    showConfigModal = true;
  }

  function closeConfigModal() { showConfigModal = false; }

  async function saveConfig() {
    const name = cfgName.trim();
    const prompt = cfgPrompt.trim();
    if (!name || !prompt) return;
    savingCfg = true;
    saveConfigError = null;
    try {
      const payload = {
        name,
        description: cfgDescription.trim(),
        schedule: formToCron(cfgFreq, cfgDow, cfgDom),
        promptTemplate: prompt,
        periodHours: freqToPeriodHours(cfgFreq),
        accentColor: cfgAccentColor,
      };
      if (editingConfig) {
        await updateDigestConfig(editingConfig.id, { ...payload, isActive: cfgIsActive });
        digestConfigs = digestConfigs.map((c) =>
          c.id === editingConfig!.id ? { ...c, ...payload, isActive: cfgIsActive } : c
        );
      } else {
        const created = await createDigestConfig(butler.id, payload);
        digestConfigs = [created, ...digestConfigs];
      }
      closeConfigModal();
    } catch (e) {
      saveConfigError = e instanceof Error ? e.message : "保存に失敗しました";
    } finally {
      savingCfg = false;
    }
  }

  async function execDeleteConfig() {
    if (!editingConfig) return;
    deletingCfg = true;
    try {
      await deleteDigestConfig(editingConfig.id);
      digestConfigs = digestConfigs.filter((c) => c.id !== editingConfig!.id);
      closeConfigModal();
    } catch (e) {
      saveConfigError = e instanceof Error ? e.message : "削除に失敗しました";
      deletingCfg = false;
      confirmDeleteConfig = false;
    }
  }
</script>

<div class="pb-10">
  <!-- ── Avatar section ──────────────────────────────────────────────────── -->
  <div class="flex flex-col items-center gap-3 pt-16 pb-6 px-4">

    <!-- Avatar -->
    {#if butler.iconUrl}
      <img
        src={butler.iconUrl}
        alt={butler.name}
        class="w-24 h-24 rounded-full object-cover shadow-md border-2 border-base-200"
      />
    {:else}
      <div
        class="w-24 h-24 rounded-full flex items-center justify-center shadow-md"
        style="background-color: {butler.iconColor}22; border: 3px solid {butler.iconColor}50;"
      >
        <svg class="w-12 h-12" style="color: {butler.iconColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.5"/>
          <circle cx="12" cy="2.5" r="0.5" fill="currentColor" stroke="none"/>
          <rect x="4" y="5.5" width="16" height="11" rx="2"/>
          <circle cx="9" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 14h6"/>
        </svg>
      </div>
    {/if}

    <!-- Name -->
    <h2 class="text-xl font-bold tracking-tight text-center">{butler.name}</h2>

    <!-- Description -->
    {#if butler.description}
      <p class="text-sm text-base-content/60 text-center max-w-sm">{butler.description}</p>
    {:else}
      <p class="text-sm text-base-content/30 italic text-center">説明なし</p>
    {/if}

    <!-- Edit / Delete buttons -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={openEdit}
        class="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-base-200"
        aria-label="編集"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
        </svg>
        編集
      </button>
      <button
        type="button"
        onclick={() => { showDeleteModal = true; deleteError = null; }}
        class="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-error transition-colors px-3 py-1.5 rounded-full hover:bg-base-200"
        aria-label="削除"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
        削除
      </button>
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
      {#if !loadingData}
        <button
          type="button"
          onclick={openCreateConfig}
          class="flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label="レポート設定を追加"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          追加
        </button>
      {/if}
    </div>

    {#if loadingData}
      <div class="flex flex-col gap-3">
        <div class="skeleton h-24 w-full rounded-2xl"></div>
        <div class="skeleton h-24 w-full rounded-2xl"></div>
      </div>
    {:else if digestConfigs.length === 0}
      <button
        type="button"
        onclick={openCreateConfig}
        class="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-base-200 text-base-content/40 hover:border-primary/30 hover:text-primary transition-all"
      >
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="text-sm">レポート設定を追加</span>
      </button>
    {:else}
      <div class="flex flex-col gap-3">
        {#each digestConfigs as dc (dc.id)}
          <div class="rounded-2xl bg-base-100 border border-base-200 overflow-hidden
                      {dc.isActive ? '' : 'opacity-60'}">
            <!-- Accent color stripe -->
            <div class="h-1.5 w-full" style="background-color: {dc.accentColor};"></div>

            <div class="p-4 flex gap-3 items-center">
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
                  {#if !dc.isActive}
                    <span class="badge badge-xs badge-ghost">無効</span>
                  {/if}
                </div>
              </div>

              <!-- Edit button -->
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content shrink-0"
                onclick={() => openEditConfig(dc)}
                aria-label="レポート設定を編集"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ── Edit modal ──────────────────────────────────────────────────────────── -->
{#if showEditModal}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={closeEdit}
    onkeydown={(e) => e.key === 'Escape' && closeEdit()}
  ></div>

  <!-- Sheet / Dialog -->
  <div
    class="fixed z-50 bg-base-100 shadow-xl
      inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe
      lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[420px]"
    role="dialog"
    aria-modal="true"
    aria-label="AI執事を編集"
  >
    <!-- Pull handle (mobile only) -->
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden"></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 mb-5">
      <h3 class="font-bold text-lg">AI執事を編集</h3>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        onclick={closeEdit}
        aria-label="閉じる"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="px-5 pb-6">
      <!-- Avatar upload -->
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
          aria-label="アイコン画像を変更"
        >
          {#if editIconPreviewUrl}
            <img
              src={editIconPreviewUrl}
              alt="プレビュー"
              class="w-20 h-20 rounded-full object-cover shadow-md border-2 border-base-200 group-hover:opacity-80 transition-opacity"
            />
          {:else if butler.iconUrl}
            <img
              src={butler.iconUrl}
              alt={butler.name}
              class="w-20 h-20 rounded-full object-cover shadow-md border-2 border-base-200 group-hover:opacity-80 transition-opacity"
            />
          {:else}
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center shadow-md group-hover:opacity-80 transition-opacity"
              style="background-color: {editColor}22; border: 2.5px solid {editColor}50;"
            >
              <svg class="w-9 h-9" style="color: {editColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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
        <p class="text-xs text-base-content/40">タップして画像を変更</p>

        <!-- Color picker -->
        <div class="w-full">
          <p class="text-xs text-base-content/50 text-center mb-2">背景カラー</p>
          <div class="flex justify-center gap-2">
            {#each ICON_COLORS as color}
              <button
                type="button"
                class="w-8 h-8 rounded-full transition-all duration-100 flex items-center justify-center shrink-0"
                style="background-color: {color};"
                class:ring-2={editColor === color}
                class:ring-offset-2={editColor === color}
                class:ring-base-content={editColor === color}
                onclick={() => (editColor = color)}
                aria-label="カラー {color}"
              >
                {#if editColor === color}
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
        onsubmit={(e) => { e.preventDefault(); saveEdit(); }}
        class="flex flex-col gap-3"
      >
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm font-medium">名前 <span class="text-error">*</span></span></div>
          <input
            type="text"
            class="input input-bordered rounded-full px-4"
            placeholder="例: テクノロジーニュース"
            bind:value={editName}
            required
            autofocus
          />
        </label>
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm font-medium">説明</span></div>
          <textarea
            class="textarea textarea-bordered rounded-2xl resize-none"
            rows="2"
            placeholder="このAI執事の役割や目的"
            bind:value={editDescription}
          ></textarea>
        </label>

        {#if saveError}
          <div class="alert alert-error py-2 text-sm">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            <span>{saveError}</span>
          </div>
        {/if}

        <button
          type="submit"
          class="btn btn-primary rounded-full w-full mt-1"
          disabled={saving || !editName.trim()}
        >
          {#if saving}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            保存
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}

<!-- ── DigestConfig add / edit modal ───────────────────────────────────────── -->
{#if showConfigModal}
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={closeConfigModal}
    onkeydown={(e) => e.key === "Escape" && closeConfigModal()}
  ></div>

  <div
    class="fixed z-50 bg-base-100 shadow-xl
           inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe overflow-y-auto max-h-[90dvh]
           lg:inset-auto lg:top-1/2 lg:left-1/2
           lg:-translate-x-1/2 lg:-translate-y-1/2
           lg:rounded-2xl lg:w-[480px] lg:max-h-[85dvh]"
    role="dialog"
    aria-modal="true"
    aria-label={editingConfig ? "レポート設定を編集" : "レポート設定を追加"}
  >
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden"></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 mb-5">
      <h3 class="font-bold text-lg">
        {editingConfig ? "レポート設定を編集" : "レポート設定を追加"}
      </h3>
      <button type="button" class="btn btn-ghost btn-sm btn-circle" onclick={closeConfigModal} aria-label="閉じる">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <form class="px-5 pb-6 flex flex-col gap-4" autocomplete="off" onsubmit={(e) => { e.preventDefault(); saveConfig(); }}>

      <!-- isActive toggle (編集時のみ) -->
      {#if editingConfig}
        <div class="flex items-center justify-between py-2 px-4 rounded-2xl bg-base-200/50">
          <span class="text-sm font-medium">有効</span>
          <input
            type="checkbox"
            class="toggle toggle-success toggle-sm"
            bind:checked={cfgIsActive}
            aria-label="有効・無効"
          />
        </div>
      {/if}

      <!-- Name -->
      <label class="form-control">
        <div class="label pb-1"><span class="label-text text-sm font-medium">名前 <span class="text-error">*</span></span></div>
        <input type="text" class="input input-bordered rounded-full px-4 w-full" placeholder="例: デイリーダイジェスト" bind:value={cfgName} required autofocus autocomplete="off" />
      </label>

      <!-- Description -->
      <label class="form-control">
        <div class="label pb-1"><span class="label-text text-sm font-medium">説明</span></div>
        <input type="text" class="input input-bordered rounded-full px-4 w-full" placeholder="例: 毎朝0時に過去24時間のニュースをまとめる" bind:value={cfgDescription} autocomplete="off" />
      </label>

      <!-- Schedule frequency -->
      <div class="form-control">
        <div class="label pb-2">
          <span class="label-text text-sm font-medium">実行頻度</span>
          <span class="label-text-alt text-xs text-base-content/40">0:00にキューイング</span>
        </div>
        <div class="grid grid-cols-4 gap-1">
          {#each ([["none", "手動のみ"], ["daily", "毎日"], ["weekly", "毎週"], ["monthly", "毎月"]] as const) as [val, label]}
            <button
              type="button"
              class="btn btn-sm rounded-full {cfgFreq === val ? 'btn-primary' : 'btn-ghost border border-base-300'}"
              onclick={() => (cfgFreq = val)}
            >{label}</button>
          {/each}
        </div>
      </div>

      {#if cfgFreq === "weekly"}
        <div class="form-control">
          <div class="label pb-2"><span class="label-text text-sm font-medium">曜日</span></div>
          <div class="grid grid-cols-7 gap-1">
            {#each (["日", "月", "火", "水", "木", "金", "土"] as const) as day, i}
              <button type="button"
                class="btn btn-sm rounded-full {cfgDow === i ? 'btn-primary' : 'btn-ghost border border-base-300'}"
                onclick={() => (cfgDow = i)}
              >{day}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#if cfgFreq === "monthly"}
        <label class="form-control">
          <div class="label pb-1"><span class="label-text text-sm font-medium">日</span></div>
          <select class="select select-bordered rounded-full px-4 w-full" bind:value={cfgDom}>
            {#each Array.from({ length: 28 }, (_, i) => i + 1) as d}
              <option value={d}>{d}日</option>
            {/each}
          </select>
        </label>
      {/if}

      <!-- Prompt template -->
      <label class="form-control">
        <div class="label pb-1"><span class="label-text text-sm font-medium">プロンプトテンプレート <span class="text-error">*</span></span></div>
        <textarea class="textarea textarea-bordered rounded-2xl px-4 min-h-[100px] resize-none w-full" placeholder="ニュースをまとめる際の指示を入力..." bind:value={cfgPrompt} required autocomplete="off"></textarea>
      </label>

      <!-- Accent color -->
      <div class="form-control">
        <div class="label pb-2"><span class="label-text text-sm font-medium">アクセントカラー</span></div>
        <div class="flex gap-2 flex-wrap">
          {#each ICON_COLORS as color}
            <button
              type="button"
              class="w-7 h-7 rounded-full border-2 transition-all"
              class:border-base-content={cfgAccentColor === color}
              class:border-transparent={cfgAccentColor !== color}
              class:scale-110={cfgAccentColor === color}
              style="background-color: {color};"
              onclick={() => (cfgAccentColor = color)}
              aria-label={color}
            ></button>
          {/each}
        </div>
      </div>

      {#if saveConfigError}
        <div class="alert alert-error py-2 text-sm">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
          </svg>
          <span>{saveConfigError}</span>
        </div>
      {/if}

      <button type="submit" class="btn btn-primary rounded-full w-full" disabled={savingCfg || !cfgName.trim() || !cfgPrompt.trim()}>
        {#if savingCfg}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          {editingConfig ? "保存" : "追加"}
        {/if}
      </button>

      <!-- Delete (編集時のみ) -->
      {#if editingConfig}
        <div class="border-t border-base-200 pt-4 mt-1">
          {#if confirmDeleteConfig}
            <p class="text-sm text-center text-base-content/60 mb-3">本当に削除しますか？この操作は取り消せません。</p>
            <div class="flex gap-2">
              <button type="button" class="btn btn-ghost rounded-full flex-1" onclick={() => (confirmDeleteConfig = false)} disabled={deletingCfg}>キャンセル</button>
              <button type="button" class="btn btn-error rounded-full flex-1" onclick={execDeleteConfig} disabled={deletingCfg}>
                {#if deletingCfg}<span class="loading loading-spinner loading-sm"></span>{:else}削除する{/if}
              </button>
            </div>
          {:else}
            <button type="button" class="btn btn-ghost rounded-full w-full text-error hover:bg-error/10" onclick={() => (confirmDeleteConfig = true)}>
              削除
            </button>
          {/if}
        </div>
      {/if}
    </form>
  </div>
{/if}

<!-- ── Delete confirmation modal ───────────────────────────────────────────── -->
{#if showDeleteModal}
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
    role="button"
    tabindex="-1"
    aria-label="閉じる"
    onclick={() => !deleting && (showDeleteModal = false)}
    onkeydown={(e) => e.key === "Escape" && !deleting && (showDeleteModal = false)}
  ></div>

  <div
    class="fixed z-50 bg-base-100 shadow-xl
           inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe
           lg:inset-auto lg:top-1/2 lg:left-1/2
           lg:-translate-x-1/2 lg:-translate-y-1/2
           lg:rounded-2xl lg:w-[380px]"
    role="dialog"
    aria-modal="true"
    aria-label="AI執事を削除"
  >
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden"></div>

    <div class="px-5 pb-6">
      <!-- Icon -->
      <div class="flex flex-col items-center gap-3 mb-5 mt-2">
        <div class="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
          <svg class="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <h3 class="font-bold text-lg">AI執事を削除</h3>
        <p class="text-sm text-base-content/60 text-center">
          <span class="font-semibold text-base-content">{butler.name}</span> を削除しますか？<br/>
          この操作は取り消せません。
        </p>
      </div>

      {#if deleteError}
        <div class="alert alert-error py-2 text-sm mb-3">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
          </svg>
          <span>{deleteError}</span>
        </div>
      {/if}

      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-ghost rounded-full flex-1"
          onclick={() => (showDeleteModal = false)}
          disabled={deleting}
        >
          キャンセル
        </button>
        <button
          type="button"
          class="btn btn-error rounded-full flex-1"
          onclick={execDelete}
          disabled={deleting}
        >
          {#if deleting}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            削除する
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
