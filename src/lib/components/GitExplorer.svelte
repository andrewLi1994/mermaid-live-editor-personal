<script lang="ts">
  import { getFileContent, listDiagrams } from '$lib/util/github';
  import { githubConfigStore } from '$lib/util/githubConfig';
  import { notify } from '$lib/util/notify';
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { onMount } from 'svelte';
  import FileIcon from '~icons/material-symbols/description-outline';
  import FolderIcon from '~icons/material-symbols/folder-open-outline';
  import RefreshIcon from '~icons/material-symbols/refresh-rounded';
  import SettingsIcon from '~icons/material-symbols/settings-outline-rounded';
  import { Button } from './ui/button';
  import { Input } from './ui/input';
  import { Separator } from './ui/separator';

  interface GitHubFile {
    name: string;
    path: string;
    [key: string]: unknown;
  }

  let diagrams = $state<GitHubFile[]>([]);
  let loading = $state(false);
  let showSettings = $state(false);

  // Local state for settings to avoid direct binding issues with $githubConfigStore
  let token = $state($githubConfigStore.token);
  let repo = $state($githubConfigStore.repo);
  let path = $state($githubConfigStore.path);

  const saveSettings = () => {
    githubConfigStore.set({ path, repo, token });
    showSettings = false;
    void fetchDiagrams();
  };

  const generateDefaultFilename = (files: GitHubFile[]) => {
    const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
    let index = 1;
    while (existingNames.has(`diagram-${index}.mmd`)) {
      index++;
    }
    return `diagram-${index}.mmd`;
  };

  const fetchDiagrams = async () => {
    if (!$githubConfigStore.token || !$githubConfigStore.repo) {
      return;
    }
    loading = true;
    try {
      diagrams = await listDiagrams();
      // Auto-fill filename if it's currently empty
      if (!$stateStore.filename && diagrams.length >= 0) {
        const newFilename = generateDefaultFilename(diagrams);
        updateCodeStore({ filename: newFilename });
      }
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      loading = false;
    }
  };

  const loadDiagram = async (file: GitHubFile) => {
    loading = true;
    try {
      const content = await getFileContent(file.path);
      updateCodeStore({
        code: content,
        filename: file.name,
        originalFilename: file.name,
        updateDiagram: true
      });
      notify(`Loaded ${file.name}`);
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchDiagrams();
  });
</script>

<div class="flex h-full flex-col gap-4 overflow-hidden p-2">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 font-bold">
      <FolderIcon class="text-xl" />
      <span>GitHub Repository</span>
    </div>
    <div class="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        onclick={() => (showSettings = !showSettings)}
        title="Settings">
        <SettingsIcon />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onclick={fetchDiagrams}
        title="Refresh"
        disabled={loading}>
        <RefreshIcon class={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  </div>

  {#if showSettings}
    <div class="flex flex-col gap-3 rounded-md border bg-secondary/20 p-3 text-sm">
      <div class="flex flex-col gap-1">
        <label for="token">Personal Access Token</label>
        <Input id="token" type="password" bind:value={token} placeholder="github_pat_..." />
      </div>
      <div class="flex flex-col gap-1">
        <label for="repo">Repository (user/repo)</label>
        <Input id="repo" bind:value={repo} placeholder="username/my-diagrams" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="path">Path in Repo</label>
        <Input id="path" bind:value={path} placeholder="diagrams" />
      </div>
      <Button size="sm" onclick={saveSettings}>Save & Close</Button>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <label for="filename" class="text-sm font-medium">Current Filename</label>
    <Input
      id="filename"
      value={$stateStore.filename}
      oninput={(e) => updateCodeStore({ filename: e.currentTarget.value })}
      placeholder="diagram-name.mmd" />
    {#if $stateStore.originalFilename && $stateStore.filename !== $stateStore.originalFilename}
      <div
        class="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
        You are about to save this as a new file. The original <strong
          >{$stateStore.originalFilename}</strong>
        will remain in Git.<br />
        <button
          class="mt-1 font-semibold underline hover:text-orange-600 dark:hover:text-orange-400"
          onclick={() => updateCodeStore({ originalFilename: $stateStore.filename })}>
          Rename instead
        </button>
      </div>
    {/if}
  </div>

  <Separator />

  <div class="flex-1 overflow-auto">
    {#if loading && diagrams.length === 0}
      <div class="flex h-32 items-center justify-center text-primary-foreground/50">
        Loading diagrams...
      </div>
    {:else if diagrams.length === 0}
      <div
        class="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-primary-foreground/50">
        <p>No .mmd files found.</p>
        <p class="text-xs">Configure your GitHub repo and token above.</p>
      </div>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each diagrams as file (file.path)}
          <li
            class="group flex items-center justify-between rounded-md border p-2 hover:bg-accent hover:text-accent-foreground">
            <div class="flex items-center gap-2 overflow-hidden">
              <FileIcon class="shrink-0" />
              <span class="truncate text-sm" title={file.name}>{file.name}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onclick={() => loadDiagram(file)}
              disabled={loading}>
              Load
            </Button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
