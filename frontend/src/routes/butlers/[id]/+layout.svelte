<script lang="ts">
  import { page } from "$app/state";
  import { updateButler } from "$lib/firestore";
  import type { LayoutData } from "./$types";

  let { children, data }: { children: any; data: LayoutData } = $props();

  let isDetailRoot = $derived(page.url.pathname === `/butlers/${data.butler.id}`);
  let isActive = $state(data.butler.isActive);
  let toggling = $state(false);

  async function toggleActive() {
    if (toggling) return;
    toggling = true;
    try {
      await updateButler(data.butler.id, { isActive: !isActive });
      isActive = !isActive;
    } finally {
      toggling = false;
    }
  }
</script>

<div class="relative">
  <!-- Floating overlay buttons -->
  <div class="absolute top-3 inset-x-0 z-10 flex items-start justify-between px-3 pointer-events-none">
    <!-- Back -->
    <a
      href="/butlers"
      class="pointer-events-auto w-9 h-9 rounded-full bg-base-100/85 backdrop-blur-sm shadow-sm border border-base-200 flex items-center justify-center text-base-content/70 hover:text-base-content transition-colors"
      aria-label="戻る"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>

    <!-- Active toggle (detail root only) -->
    {#if isDetailRoot}
      <button
        type="button"
        onclick={toggleActive}
        disabled={toggling}
        class="pointer-events-auto w-9 h-9 rounded-full shadow-sm border flex items-center justify-center transition-all duration-200
          {isActive
            ? 'bg-success border-success text-success-content'
            : 'bg-base-100/85 backdrop-blur-sm border-base-300 text-base-content/40'}"
        aria-label={isActive ? "有効（タップで無効化）" : "無効（タップで有効化）"}
      >
        {#if toggling}
          <span class="loading loading-spinner loading-xs"></span>
        {:else if isActive}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        {:else}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" stroke-dasharray="4 2"/>
          </svg>
        {/if}
      </button>
    {/if}
  </div>

  {@render children()}
</div>
