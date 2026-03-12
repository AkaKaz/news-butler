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
  <!-- Back button -->
  <div class="absolute top-3 left-3 z-10 pointer-events-none">
    <a
      href="/butlers"
      class="pointer-events-auto w-9 h-9 rounded-full bg-base-100/85 backdrop-blur-sm shadow-sm border border-base-200 flex items-center justify-center text-base-content/70 hover:text-base-content transition-colors"
      aria-label="戻る"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
  </div>

  <!-- Active toggle: always visible (mobile: top-right overlay, PC: top-right) -->
  {#if isDetailRoot}
    <div class="absolute top-3 right-3 z-10">
      {#if toggling}
        <span class="loading loading-spinner loading-xs text-base-content/40"></span>
      {:else}
        <input
          type="checkbox"
          class="toggle toggle-success toggle-sm"
          checked={isActive}
          disabled={toggling}
          onchange={toggleActive}
          aria-label={isActive ? "有効（タップで無効化）" : "無効（タップで有効化）"}
        />
      {/if}
    </div>
  {/if}

  {@render children()}
</div>
