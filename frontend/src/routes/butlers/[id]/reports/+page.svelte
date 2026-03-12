<script lang="ts">
  import {
    getDigestConfigs,
    createDigestConfig,
    updateDigestConfig,
    toggleDigestConfig,
    deleteDigestConfig,
  } from "$lib/firestore";
  import { ICON_COLORS } from "$lib/types";
  import type { DigestConfig } from "$lib/types";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let configs = $state<DigestConfig[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  // Schedule helpers
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
    return 24; // daily or none
  }

  function formatSchedule(schedule: string | null): string {
    if (!schedule) return "手動のみ";
    const { freq, dow, dom } = cronToForm(schedule);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    if (freq === "daily") return "毎日 0:00";
    if (freq === "weekly") return `毎週${days[dow] ?? ""}曜 0:00`;
    if (freq === "monthly") return `毎月${dom}日 0:00`;
    return schedule;
  }

  // Modal state
  let showModal = $state(false);
  let editing = $state<DigestConfig | null>(null);
  let formName = $state("");
  let formDescription = $state("");
  let formFreq = $state<ScheduleFreq>("none");
  let formDow = $state(1);   // day of week: 0=日 ... 6=土
  let formDom = $state(1);   // day of month: 1-31
  let formPrompt = $state("");
  let formAccentColor = $state(ICON_COLORS[0]);
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  // Per-row
  let togglingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);

  async function load() {
    loading = true;
    loadError = null;
    try {
      configs = await getDigestConfigs(data.butler.id);
    } catch (e) {
      loadError = e instanceof Error ? e.message : "読み込みに失敗しました";
    } finally {
      loading = false;
    }
  }

  $effect(() => { load(); });

  function openCreate() {
    editing = null;
    formName = "";
    formDescription = "";
    formFreq = "none";
    formDow = 1;
    formDom = 1;
    formPrompt = "";
    formAccentColor = ICON_COLORS[0];
    saveError = null;
    showModal = true;
  }

  function openEdit(cfg: DigestConfig) {
    editing = cfg;
    formName = cfg.name;
    formDescription = cfg.description;
    const parsed = cronToForm(cfg.schedule);
    formFreq = parsed.freq;
    formDow = parsed.dow;
    formDom = parsed.dom;
    formPrompt = cfg.promptTemplate;
    formAccentColor = cfg.accentColor;
    saveError = null;
    showModal = true;
  }

  function closeModal() { showModal = false; }

  async function save() {
    const name = formName.trim();
    const prompt = formPrompt.trim();
    if (!name || !prompt) return;
    saving = true;
    saveError = null;
    try {
      const payload = {
        name,
        description: formDescription.trim(),
        schedule: formToCron(formFreq, formDow, formDom),
        promptTemplate: prompt,
        periodHours: freqToPeriodHours(formFreq),
        accentColor: formAccentColor,
      };
      if (editing) {
        await updateDigestConfig(editing.id, payload);
        configs = configs.map((c) => c.id === editing!.id ? { ...c, ...payload } : c);
      } else {
        const created = await createDigestConfig(data.butler.id, payload);
        configs = [created, ...configs];
      }
      closeModal();
    } catch (e) {
      saveError = e instanceof Error ? e.message : "保存に失敗しました";
    } finally {
      saving = false;
    }
  }

  async function toggle(cfg: DigestConfig) {
    if (togglingId) return;
    togglingId = cfg.id;
    try {
      await toggleDigestConfig(cfg.id, !cfg.isActive);
      configs = configs.map((c) => c.id === cfg.id ? { ...c, isActive: !c.isActive } : c);
    } finally {
      togglingId = null;
    }
  }

  async function confirmDelete(id: string) {
    if (deletingId) return;
    deletingId = id;
    confirmDeleteId = null;
    try {
      await deleteDigestConfig(id);
      configs = configs.filter((c) => c.id !== id);
    } finally {
      deletingId = null;
    }
  }

  function formatLastRun(ts: { seconds: number; nanoseconds: number } | null): string {
    if (!ts) return "未実行";
    const diff = Date.now() / 1000 - ts.seconds;
    if (diff < 60) return "たった今";
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  }

</script>

<!-- ── Page header ──────────────────────────────────────────────────────────── -->
<div class="px-4 lg:px-6 pt-16 pb-4 flex items-center justify-between">
  <div>
    <h2 class="text-base font-bold tracking-tight">レポート設定</h2>
    <p class="text-xs text-base-content/50 mt-0.5">{data.butler.name}</p>
  </div>
  {#if !loading}
    <button
      type="button"
      class="btn btn-primary btn-sm rounded-full gap-1"
      onclick={openCreate}
      aria-label="レポート設定を追加"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      追加
    </button>
  {/if}
</div>

<!-- ── Config list ──────────────────────────────────────────────────────────── -->
<div class="px-4 lg:px-6 pb-10">
  {#if loading}
    <div class="flex flex-col gap-3">
      {#each [1, 2] as _}
        <div class="skeleton h-24 w-full rounded-2xl"></div>
      {/each}
    </div>

  {:else if loadError}
    <div class="alert alert-error py-2 text-sm">
      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
      </svg>
      <span>{loadError}</span>
    </div>

  {:else if configs.length === 0}
    <button
      type="button"
      class="w-full flex flex-col items-center justify-center gap-2 py-12
             rounded-2xl border-2 border-dashed border-base-200
             text-base-content/40 hover:border-primary/30 hover:text-primary
             transition-all"
      onclick={openCreate}
    >
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5
             7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5
             3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0
             .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504
             1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <span class="text-sm font-medium">レポート設定を追加</span>
      <span class="text-xs">ニュースをまとめるスケジュールを設定します</span>
    </button>

  {:else}
    <div class="flex flex-col gap-2">
      {#each configs as cfg (cfg.id)}
        {@const isDeleting = deletingId === cfg.id}
        {@const isToggling = togglingId === cfg.id}

        <div
          class="rounded-2xl bg-base-100 border border-base-200 transition-opacity duration-200"
          class:opacity-40={isDeleting}
        >
          <div class="flex items-start gap-3 px-4 py-3">
            <!-- Accent dot -->
            <span
              class="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style="background-color: {cfg.accentColor};"
            ></span>

            <!-- Name + schedule + last run -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-snug truncate">{cfg.name}</p>
              {#if cfg.description}
                <p class="text-xs text-base-content/45 truncate mt-0.5">{cfg.description}</p>
              {/if}
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="badge badge-ghost badge-xs font-mono">
                  {formatSchedule(cfg.schedule)}
                </span>
                <span class="text-xs text-base-content/35">
                  最終実行: {formatLastRun(cfg.lastRunAt)}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <!-- Toggle -->
              {#if isToggling}
                <span class="w-8 h-8 flex items-center justify-center">
                  <span class="loading loading-spinner loading-xs text-base-content/40"></span>
                </span>
              {:else}
                <input
                  type="checkbox"
                  class="toggle toggle-success toggle-sm"
                  checked={cfg.isActive}
                  onchange={() => toggle(cfg)}
                  aria-label={cfg.isActive ? "有効" : "無効"}
                />
              {/if}

              <!-- Edit -->
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content"
                onclick={() => openEdit(cfg)}
                aria-label="編集"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582
                       16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0
                       011.13-1.897l8.932-8.931z" />
                </svg>
              </button>

              <!-- Delete -->
              {#if confirmDeleteId === cfg.id}
                <button
                  type="button"
                  class="btn btn-error btn-sm rounded-full text-xs px-3 h-8 min-h-0"
                  disabled={isDeleting}
                  onclick={() => confirmDelete(cfg.id)}
                >
                  {#if isDeleting}
                    <span class="loading loading-spinner loading-xs"></span>
                  {:else}
                    削除確認
                  {/if}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle text-base-content/40"
                  onclick={() => (confirmDeleteId = null)}
                  aria-label="キャンセル"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {:else}
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-error"
                  onclick={() => (confirmDeleteId = cfg.id)}
                  aria-label="削除"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107
                         1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0
                         01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772
                         5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12
                         .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0
                         013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964
                         51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09
                         2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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
           inset-x-0 bottom-0 rounded-t-3xl pt-5 pb-safe overflow-y-auto max-h-[90dvh]
           lg:inset-auto lg:top-1/2 lg:left-1/2
           lg:-translate-x-1/2 lg:-translate-y-1/2
           lg:rounded-2xl lg:w-[480px] lg:max-h-[85dvh]"
    role="dialog"
    aria-modal="true"
    aria-label={editing ? "レポート設定を編集" : "レポート設定を追加"}
  >
    <!-- Pull handle (mobile only) -->
    <div class="mx-auto w-10 h-1 rounded-full bg-base-300 mb-4 lg:hidden"></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 mb-5">
      <h3 class="font-bold text-lg">
        {editing ? "レポート設定を編集" : "レポート設定を追加"}
      </h3>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        onclick={closeModal}
        aria-label="閉じる"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <form
      class="px-5 pb-6 flex flex-col gap-4"
      onsubmit={(e) => { e.preventDefault(); save(); }}
    >
      <!-- Name -->
      <label class="form-control">
        <div class="label pb-1">
          <span class="label-text text-sm font-medium">名前 <span class="text-error">*</span></span>
        </div>
        <input
          type="text"
          class="input input-bordered rounded-full px-4"
          placeholder="例: デイリーダイジェスト"
          bind:value={formName}
          required
          autofocus
        />
      </label>

      <!-- Description -->
      <label class="form-control">
        <div class="label pb-1">
          <span class="label-text text-sm font-medium">説明</span>
        </div>
        <input
          type="text"
          class="input input-bordered rounded-full px-4"
          placeholder="例: 毎朝8時に過去24時間のニュースをまとめる"
          bind:value={formDescription}
        />
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
              class="btn btn-sm rounded-full {formFreq === val ? 'btn-primary' : 'btn-ghost border border-base-300'}"
              onclick={() => (formFreq = val)}
            >{label}</button>
          {/each}
        </div>
      </div>

      {#if formFreq === "weekly"}
        <div class="form-control">
          <div class="label pb-2">
            <span class="label-text text-sm font-medium">曜日</span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            {#each (["日", "月", "火", "水", "木", "金", "土"] as const) as day, i}
              <button
                type="button"
                class="btn btn-sm rounded-full {formDow === i ? 'btn-primary' : 'btn-ghost border border-base-300'}"
                onclick={() => (formDow = i)}
              >{day}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#if formFreq === "monthly"}
        <label class="form-control">
          <div class="label pb-1">
            <span class="label-text text-sm font-medium">日</span>
          </div>
          <select class="select select-bordered rounded-full px-4" bind:value={formDom}>
            {#each Array.from({ length: 28 }, (_, i) => i + 1) as d}
              <option value={d}>{d}日</option>
            {/each}
          </select>
        </label>
      {/if}

      <!-- Prompt template -->
      <label class="form-control">
        <div class="label pb-1">
          <span class="label-text text-sm font-medium">プロンプトテンプレート <span class="text-error">*</span></span>
        </div>
        <textarea
          class="textarea textarea-bordered rounded-2xl px-4 text-sm min-h-[100px] resize-none"
          placeholder="ニュースをまとめる際の指示を入力..."
          bind:value={formPrompt}
          required
        ></textarea>
      </label>

      <!-- Accent color -->
      <div class="form-control">
        <div class="label pb-2">
          <span class="label-text text-sm font-medium">アクセントカラー</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          {#each ICON_COLORS as color}
            <button
              type="button"
              class="w-7 h-7 rounded-full border-2 transition-all"
              class:border-base-content={formAccentColor === color}
              class:border-transparent={formAccentColor !== color}
              class:scale-110={formAccentColor === color}
              style="background-color: {color};"
              onclick={() => (formAccentColor = color)}
              aria-label={color}
            ></button>
          {/each}
        </div>
      </div>

      {#if saveError}
        <div class="alert alert-error py-2 text-sm">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0
                 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898
                 0L2.697 16.126z" />
          </svg>
          <span>{saveError}</span>
        </div>
      {/if}

      <button
        type="submit"
        class="btn btn-primary rounded-full w-full mt-1"
        disabled={saving || !formName.trim() || !formPrompt.trim()}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          {editing ? "保存" : "追加"}
        {/if}
      </button>
    </form>
  </div>
{/if}
