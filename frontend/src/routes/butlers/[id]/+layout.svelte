<script lang="ts">
  import { page } from "$app/state";
  import type { LayoutData } from "./$types";

  let { children, data }: { children: any; data: LayoutData } = $props();

  let isDetailRoot = $derived(page.url.pathname === `/butlers/${data.butler.id}`);
</script>

<div class="flex flex-col">
  <!-- Sticky header: back + name + edit button (detail only) -->
  <div class="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-base-100/95 backdrop-blur-sm border-b border-base-200 lg:px-6">
    <a href="/butlers" class="btn btn-ghost btn-sm btn-circle shrink-0" aria-label="戻る">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <span class="font-bold text-base tracking-tight truncate">{data.butler.name}</span>
    <div class="ml-auto flex items-center gap-1.5 shrink-0">
      <span
        class="badge badge-sm"
        class:badge-success={data.butler.isActive}
        class:badge-ghost={!data.butler.isActive}
      >
        {data.butler.isActive ? "有効" : "無効"}
      </span>
      {#if isDetailRoot}
        <a
          href="?edit"
          class="btn btn-ghost btn-sm btn-circle"
          aria-label="編集"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </a>
      {/if}
    </div>
  </div>

  <!-- Page content -->
  {@render children()}
</div>
