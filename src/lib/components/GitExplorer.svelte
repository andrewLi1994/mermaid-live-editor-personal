<script lang="ts">
  import {
    deleteDiagram,
    getFileContent,
    githubFilesStore,
    listDiagrams,
    type GitHubFile
  } from '$lib/util/github';
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
  import ConfirmDialog from './ConfirmDialog.svelte';

  let loading = $state(false);
  let showSettings = $state(false);
  let deletingFile = $state<string | null>(null);

  // Confirm dialog state
  let confirmOpen = $state(false);
  let fileToDelete = $state<GitHubFile | null>(null);

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
      const files = await listDiagrams();
      // Auto-fill filename if it's currently empty
      if (!$stateStore.filename && files.length >= 0) {
        const newFilename = generateDefaultFilename(files);
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

  const requestDelete = (file: GitHubFile) => {
    fileToDelete = file;
    confirmOpen = true;
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    const file = fileToDelete;
    deletingFile = file.name;
    try {
      await deleteDiagram(file.path);
      // Remove from store immediately for instant UI feedback
      githubFilesStore.update((files) => files.filter((f) => f.path !== file.path));
      updateCodeStore({ lastActionTimestamp: Date.now() });
      notify(`Deleted ${file.name}`);
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      deletingFile = null;
      fileToDelete = null;
    }
  };

  $effect(() => {
    if ($stateStore.lastActionTimestamp && $stateStore.lastActionTimestamp > 0) {
      void fetchDiagrams();
    }
  });

  onMount(() => {
    void fetchDiagrams();
  });
</script>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete Diagram"
  message={fileToDelete
    ? `Are you sure you want to delete "${fileToDelete.name}" from your repository? This action cannot be undone.`
    : ''}
  confirmLabel="Delete"
  cancelLabel="Cancel"
  onconfirm={confirmDelete} />

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

  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >Active Diagram</span>
      {#if $stateStore.originalFilename && $stateStore.filename !== $stateStore.originalFilename}
        <span
          class="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-orange-500 uppercase"
          >Renaming</span>
      {/if}
    </div>
    <div class="group relative flex items-center gap-2">
      <div class="absolute left-3 text-muted-foreground">
        <FileIcon class="size-4" />
      </div>
      <Input
        class="h-9 border-muted-foreground/20 bg-background/50 pl-9 text-sm font-medium focus:border-primary"
        value={$stateStore.title}
        oninput={(e) => updateCodeStore({ title: e.currentTarget.value })}
        placeholder="Name your diagram..." />
    </div>
    {#if $stateStore.originalFilename && $stateStore.filename !== $stateStore.originalFilename}
      <p class="px-1 text-[10px] text-muted-foreground italic">
        Target: <span class="font-mono">{$stateStore.filename}</span> (Original: {$stateStore.originalFilename})
      </p>
    {/if}
  </div>

  <Separator />

  <div class="flex-1 overflow-auto">
    {#if loading && $githubFilesStore.length === 0}
      <div class="flex h-32 items-center justify-center text-primary-foreground/50">
        Loading diagrams...
      </div>
    {:else if $githubFilesStore.length === 0}
      <div
        class="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-primary-foreground/50">
        <p>No .mmd files found.</p>
        <p class="text-xs">Configure your GitHub repo and token above.</p>
      </div>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each $githubFilesStore as file (file.path)}
          <li
            class="group flex items-center justify-between rounded-md border p-2 transition-colors
              {$stateStore.originalFilename === file.name || $stateStore.filename === file.name
              ? 'border-primary/50 bg-primary/10 text-primary-foreground dark:border-primary/30 dark:bg-primary/20'
              : 'hover:bg-accent hover:text-accent-foreground'}">
            <div class="flex items-center gap-2 overflow-hidden">
              <FileIcon
                class="shrink-0 {$stateStore.originalFilename === file.name ||
                $stateStore.filename === file.name
                  ? 'text-primary'
                  : ''}" />
              <span
                class="truncate text-sm {$stateStore.originalFilename === file.name ||
                $stateStore.filename === file.name
                  ? 'font-medium'
                  : ''}"
                title={file.name}>{file.name}</span>
            </div>
            <div class="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onclick={() => loadDiagram(file)}
                disabled={loading || deletingFile === file.name}>
                Load
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                onclick={() => requestDelete(file)}
                disabled={loading || deletingFile === file.name}>
                {deletingFile === file.name ? '...' : 'Delete'}
              </Button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
