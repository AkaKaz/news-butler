<script lang="ts">
  import { page } from "$app/state";

  let { children } = $props();

  // TODO: AI名はAPIから取得する
  const butlerId = $derived(page.params.id);

  const tabs = $derived([
    { label: "レポート", href: `/butlers/${butlerId}` },
    { label: "ソース", href: `/butlers/${butlerId}/sources` },
    { label: "レポート設定", href: `/butlers/${butlerId}/reports` },
  ]);

  function isTabActive(href: string): boolean {
    const p = page.url.pathname;
    if (href === `/butlers/${butlerId}`) return p === href;
    return p.startsWith(href);
  }
</script>

<div class="flex flex-col h-full">
  <!-- Butler header -->
  <div class="px-4 pt-4 pb-0 lg:px-6 lg:pt-6">
    <div class="flex items-center gap-2 mb-4">
      <a href="/butlers" class="btn btn-ghost btn-sm btn-circle">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </a>
      <h1 class="text-xl font-bold tracking-tight">AI名</h1>
    </div>

    <!-- Sub-navigation tabs -->
    <div role="tablist" class="tabs tabs-bordered w-full">
      {#each tabs as tab}
        <a
          href={tab.href}
          role="tab"
          class="tab"
          class:tab-active={isTabActive(tab.href)}
        >
          {tab.label}
        </a>
      {/each}
    </div>
  </div>

  <!-- Tab content -->
  <div class="flex-1 overflow-y-auto">
    {@render children()}
  </div>
</div>
