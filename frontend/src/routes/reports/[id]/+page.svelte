<script lang="ts">
  import { page } from "$app/state";
  const reportId = $derived(page.params.id);
</script>

<div class="p-4 lg:p-6">
  <div class="flex items-center gap-2 mb-4">
    <a href="/reports" class="btn btn-ghost btn-sm btn-circle">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <h1 class="text-xl font-bold tracking-tight">レポート</h1>
  </div>
  <p class="text-base-content/50">レポート ID: {reportId}</p>
</div>
