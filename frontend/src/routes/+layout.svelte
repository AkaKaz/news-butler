<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { authStore } from "$lib/auth.svelte";
  import { page } from "$app/stores";

  let { children } = $props();

  const navItems = [
    { href: "/", label: "ダッシュボード", icon: "⊞" },
    { href: "/sources", label: "ソース管理", icon: "◈" },
    { href: "/articles", label: "記事一覧", icon: "≡" },
    { href: "/topics", label: "トピック管理", icon: "◉" },
    { href: "/digests", label: "ダイジェスト", icon: "✦" },
  ];
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if authStore.loading}
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if !authStore.user}
  <div class="flex flex-col items-center justify-center h-screen gap-6 bg-base-200">
    <h1 class="text-3xl font-bold">News Butler</h1>
    <button class="btn btn-primary px-8" onclick={() => authStore.login()}>
      Google でログイン
    </button>
  </div>
{:else}
  <!-- DaisyUI drawer: lg以上は常時展開、それ以下はハンバーガー -->
  <div class="drawer lg:drawer-open h-screen">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <!-- メインコンテンツ -->
    <div class="drawer-content flex flex-col min-h-screen bg-base-200">
      <!-- モバイル用トップバー -->
      <div class="navbar bg-base-100 border-b border-base-300 lg:hidden px-4 py-2 sticky top-0 z-10">
        <label for="main-drawer" class="btn btn-ghost btn-sm drawer-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <span class="font-bold text-base ml-2">News Butler</span>
      </div>

      <!-- ページコンテンツ -->
      <main class="flex-1 p-6 max-w-5xl w-full mx-auto">
        {@render children()}
      </main>
    </div>

    <!-- サイドバー -->
    <div class="drawer-side z-20">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <aside class="bg-base-100 border-r border-base-300 w-64 flex flex-col h-full">
        <!-- ロゴ -->
        <div class="px-6 py-5 border-b border-base-300">
          <span class="font-bold text-lg tracking-tight">News Butler</span>
        </div>

        <!-- ナビゲーション -->
        <nav class="flex-1 px-3 py-4 overflow-y-auto">
          <ul class="menu menu-md gap-1 p-0">
            {#each navItems as item}
              <li>
                <a
                  href={item.href}
                  class={$page.url.pathname === item.href ? "active font-medium" : ""}
                >
                  <span class="text-base">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        </nav>

        <!-- ユーザー情報 -->
        <div class="border-t border-base-300 px-4 py-4">
          <div class="flex items-center gap-3">
            {#if authStore.user.photoURL}
              <img
                src={authStore.user.photoURL}
                alt="avatar"
                class="w-8 h-8 rounded-full"
              />
            {/if}
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{authStore.user.displayName ?? authStore.user.email}</div>
            </div>
            <button
              class="btn btn-ghost btn-xs"
              onclick={() => authStore.logout()}
              title="ログアウト"
            >
              ⏏
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
{/if}
