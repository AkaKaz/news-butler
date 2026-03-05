<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { authStore } from "$lib/auth.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if authStore.loading}
  <div class="loading">Loading...</div>
{:else if !authStore.user}
  <div class="login-page">
    <h1>News Butler</h1>
    <button onclick={() => authStore.login()}>
      Google でログイン
    </button>
  </div>
{:else}
  <div class="app">
    <nav>
      <span class="logo">News Butler</span>
      <a href="/sources">ソース管理</a>
      <a href="/articles">記事一覧</a>
      <a href="/topics">トピック管理</a>
      <a href="/digests">ダイジェスト</a>
      <button onclick={() => authStore.logout()}>ログアウト</button>
    </nav>
    <main>
      {@render children()}
    </main>
  </div>
{/if}

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: sans-serif;
    background: #f5f5f5;
    color: #333;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }

  .login-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1.5rem;
  }

  .login-page h1 {
    font-size: 2rem;
  }

  .login-page button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
  }

  .logo {
    font-weight: bold;
    font-size: 1.1rem;
    margin-right: auto;
  }

  nav a {
    text-decoration: none;
    color: #333;
    font-size: 0.9rem;
  }

  nav a:hover {
    color: #4285f4;
  }

  nav button {
    padding: 0.4rem 1rem;
    font-size: 0.875rem;
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  main {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
