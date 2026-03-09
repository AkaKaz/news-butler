<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { authStore } from "$lib/auth.svelte";
  import { page } from "$app/state";
  import { goto, onNavigate } from "$app/navigation";

  let { children } = $props();

  const tabPaths = ["/digests", "/articles", "/sources"];

  function isActive(path: string): boolean {
    const p = page.url.pathname;
    if (path === "/digests") return p === "/digests" || p === "/";
    if (path === "/articles") return p.startsWith("/articles");
    if (path === "/sources") return p.startsWith("/sources") || p.startsWith("/topics");
    return false;
  }

  function currentTabIndex(): number {
    if (isActive("/articles")) return 1;
    if (isActive("/sources")) return 2;
    return 0;
  }

  let settingsOpen = $state(false);
  $effect(() => {
    const p = page.url.pathname;
    if (p.startsWith("/sources") || p.startsWith("/topics")) {
      settingsOpen = true;
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let pendingNavDir: "forward" | "backward" = "forward";

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 60) return;

    const idx = currentTabIndex();
    if (dx < 0 && idx < tabPaths.length - 1) {
      pendingNavDir = "forward";
      goto(tabPaths[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      pendingNavDir = "backward";
      goto(tabPaths[idx - 1]);
    }
  }

  function navigateTo(path: string) {
    const from = currentTabIndex();
    const to = tabPaths.indexOf(path);
    pendingNavDir = to >= from ? "forward" : "backward";
    goto(path);
  }

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    document.documentElement.dataset.nav = pendingNavDir;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if authStore.loading}
  <div class="flex h-screen items-center justify-center bg-base-200">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>

{:else if !authStore.user}
  <div class="login-bg flex h-screen flex-col items-center justify-center gap-8">
    <div class="login-card flex flex-col items-center gap-6 rounded-2xl p-10">
      <div class="logo-mark">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="currentColor" class="text-primary" opacity="0.12"/>
          <path d="M12 16h24M12 24h16M12 32h20" stroke="currentColor" class="text-primary" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="36" cy="30" r="6" fill="currentColor" class="text-primary"/>
          <path d="M34 30l1.5 1.5L38 28" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="text-center">
        <h1 class="text-2xl font-bold tracking-tight">News Butler</h1>
        <p class="text-base-content/60 mt-1 text-sm">あなたの情報キュレーター</p>
      </div>
      <button
        class="btn btn-primary gap-2 px-6"
        onclick={() => authStore.login()}
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google でログイン
      </button>
    </div>
  </div>

{:else}
  <div class="app-shell flex h-screen overflow-hidden">
    <!-- ── Sidebar: lg+ ── -->
    <aside class="sidebar hidden lg:flex flex-col w-60 shrink-0">
      <!-- Logo -->
      <div class="px-5 py-5 border-b border-base-200">
        <div class="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="currentColor" class="text-primary" opacity="0.12"/>
            <path d="M12 16h24M12 24h16M12 32h20" stroke="currentColor" class="text-primary" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="36" cy="30" r="6" fill="currentColor" class="text-primary"/>
            <path d="M34 30l1.5 1.5L38 28" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="font-bold text-base tracking-tight">News Butler</span>
        </div>
      </div>

      <!-- Nav Tree -->
      <ul class="menu menu-md flex-1 px-3 py-4 gap-0.5">
        <li>
          <a href="/digests" class:active={isActive("/digests")} class="nav-link">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            ダイジェスト
          </a>
        </li>
        <li>
          <a href="/articles" class:active={isActive("/articles")} class="nav-link">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            要約記事
          </a>
        </li>
        <li>
          <details bind:open={settingsOpen}>
            <summary class="nav-link">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              設定
            </summary>
            <ul>
              <li>
                <a href="/sources" class:active={page.url.pathname.startsWith("/sources")} class="nav-link text-sm">
                  ソース一覧
                </a>
              </li>
              <li>
                <a href="/topics" class:active={page.url.pathname.startsWith("/topics")} class="nav-link text-sm">
                  トピック一覧
                </a>
              </li>
            </ul>
          </details>
        </li>
      </ul>

      <!-- Logout -->
      <div class="px-3 py-4 border-t border-base-200">
        <button
          class="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/60 hover:text-base-content"
          onclick={() => authStore.logout()}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          ログアウト
        </button>
      </div>
    </aside>

    <!-- ── Main content ── -->
    <main
      class="flex-1 overflow-y-auto pb-20 lg:pb-0"
      ontouchstart={handleTouchStart}
      ontouchend={handleTouchEnd}
    >
      {@render children()}
    </main>

    <!-- ── Bottom tab bar: mobile only ── -->
    <nav class="btm-tabs lg:hidden fixed bottom-0 inset-x-0 flex border-t border-base-200 bg-base-100/95 backdrop-blur-sm safe-bottom">
      {#each [
        { path: "/digests", label: "ダイジェスト", icon: "home" },
        { path: "/articles", label: "要約記事", icon: "doc" },
        { path: "/sources", label: "設定", icon: "gear" },
      ] as tab}
        <button
          class="tab-btn flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors duration-150"
          class:active={isActive(tab.path)}
          onclick={() => navigateTo(tab.path)}
        >
          {#if tab.icon === "home"}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          {:else if tab.icon === "doc"}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          {:else}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          {/if}
          <span class="text-[10px] font-medium leading-none">{tab.label}</span>
        </button>
      {/each}
    </nav>
  </div>
{/if}

<style>
  .login-bg {
    background: radial-gradient(ellipse at 60% 40%, oklch(0.97 0.02 250), oklch(0.93 0.04 240));
    min-height: 100vh;
  }

  .login-card {
    background: oklch(1 0 0 / 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid oklch(0.9 0.02 250);
    box-shadow: 0 4px 32px oklch(0.7 0.1 250 / 0.12);
    min-width: 320px;
  }

  .sidebar {
    background: oklch(var(--b1));
    border-right: 1px solid oklch(var(--b2));
  }

  /* Tab bar active state */
  .tab-btn {
    color: oklch(var(--bc) / 0.45);
  }
  .tab-btn.active {
    color: oklch(var(--p));
  }

  /* Swipe indicator dot strip */
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* ── View Transitions ── */
  @keyframes vt-slide-out-left {
    to { transform: translateX(-100%); }
  }
  @keyframes vt-slide-in-right {
    from { transform: translateX(100%); }
  }
  @keyframes vt-slide-out-right {
    to { transform: translateX(100%); }
  }
  @keyframes vt-slide-in-left {
    from { transform: translateX(-100%); }
  }

  :global(:root[data-nav="forward"] ::view-transition-old(root)) {
    animation: vt-slide-out-left 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  :global(:root[data-nav="forward"] ::view-transition-new(root)) {
    animation: vt-slide-in-right 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  :global(:root[data-nav="backward"] ::view-transition-old(root)) {
    animation: vt-slide-out-right 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  :global(:root[data-nav="backward"] ::view-transition-new(root)) {
    animation: vt-slide-in-left 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
</style>
