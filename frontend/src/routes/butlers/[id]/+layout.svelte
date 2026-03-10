<script lang="ts">
  import type { LayoutData } from "./$types";

  let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<div class="flex flex-col">
  <!-- Sticky header: back + name + badge -->
  <div class="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-base-100/95 backdrop-blur-sm border-b border-base-200 lg:px-6">
    <a href="/butlers" class="btn btn-ghost btn-sm btn-circle shrink-0">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <span class="font-bold text-base tracking-tight truncate">{data.butler.name}</span>
    <span
      class="badge badge-sm shrink-0 ml-auto"
      class:badge-success={data.butler.isActive}
      class:badge-ghost={!data.butler.isActive}
    >
      {data.butler.isActive ? "有効" : "無効"}
    </span>
  </div>

  <!-- Page content -->
  {@render children()}
</div>
