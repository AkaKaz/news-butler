<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import SourceAddForm from "$lib/components/SourceAddForm.svelte";
  import SourceRow from "$lib/components/SourceRow.svelte";
  import type { Source } from "$lib/utils/sources";

  let sources = $state<Source[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showAddForm = $state(false);

  async function load() {
    try {
      sources = await api.get<Source[]>("/api/sources");
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function handleAdd(data: {
    name: string;
    url: string;
    category: string;
  }) {
    await api.post("/api/sources", {
      name: data.name || data.url,
      url: data.url,
      category: data.category,
    });
    showAddForm = false;
    await load();
  }

  async function handleSave(
    id: string,
    data: {
      name: string;
      category: string;
      fetchIntervalMinutes: number;
    }
  ) {
    await api.put(`/api/sources/${id}`, data);
    await load();
  }

  async function handleToggle(id: string) {
    await api.post(`/api/sources/${id}/toggle`, {});
    await load();
  }

  async function handleDelete(id: string) {
    await api.delete(`/api/sources/${id}`);
    await load();
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">ソース管理</h1>
    <button
      class="btn btn-primary"
      onclick={() => (showAddForm = !showAddForm)}
    >
      + ソースを追加
    </button>
  </div>

  {#if showAddForm}
    <SourceAddForm
      onSubmit={handleAdd}
      onCancel={() => (showAddForm = false)}
    />
  {/if}

  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">{error}</div>
  {:else if sources.length === 0}
    <div class="text-center py-16 text-base-content/50">
      ソースが登録されていません。
    </div>
  {:else}
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>名前 / URL</th>
            <th>カテゴリ</th>
            <th>最終取得</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {#each sources as source (source.id)}
            <SourceRow
              {source}
              onToggle={() => handleToggle(source.id)}
              onSave={(data) => handleSave(source.id, data)}
              onDelete={() => handleDelete(source.id)}
            />
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
