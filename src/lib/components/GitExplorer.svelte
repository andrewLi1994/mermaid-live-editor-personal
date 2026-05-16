<script lang="ts">
  import {
    deleteDiagram,
    getFileContent,
    githubFilesStore,
    githubReposStore,
    githubUserStore,
    getGitHubUser,
    listRepositories,
    loginGitHub,
    listDiagrams,
    logoutGitHub,
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
  import GithubIcon from '~icons/mdi/github';
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
  let repo = $state($githubConfigStore.repo);
  let path = $state($githubConfigStore.path);

  const saveSettings = () => {
    githubConfigStore.set({ path, repo });
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

  const fetchRepositories = async () => {
    try {
      const repos = await listRepositories();
      if (!repo && repos.length > 0) {
        repo = repos[0].fullName;
        githubConfigStore.set({ path, repo });
      }
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const fetchDiagrams = async () => {
    if (!$githubUserStore || !$githubConfigStore.repo) {
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

  const initializeGitHub = async () => {
    try {
      await getGitHubUser();
      await fetchRepositories();
      await fetchDiagrams();
    } catch {
      githubUserStore.set(null);
      githubReposStore.set([]);
      githubFilesStore.set([]);
    }
  };

  const disconnectGitHub = async () => {
    try {
      await logoutGitHub();
      notify('Disconnected from GitHub');
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRepoChange = (value: string) => {
    repo = value;
    githubConfigStore.set({ path, repo });
    void fetchDiagrams();
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
    void initializeGitHub();
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
      <div class="flex flex-col gap-1 rounded border bg-background p-2">
        <div class="font-medium">GitHub Account</div>
        {#if $githubUserStore}
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1 text-xs font-semibold text-green-500">
                <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                {$githubUserStore.login}
              </div>
              <div class="truncate text-[11px] text-muted-foreground">
                Connected with GitHub OAuth
              </div>
            </div>
            <Button size="sm" variant="outline" class="mt-1" onclick={disconnectGitHub}
              >Disconnect</Button>
          </div>
        {:else}
          <div class="pb-1 text-[11px] text-muted-foreground">
            Log in to sync with your repositories securely.
          </div>
          <Button size="sm" class="bg-black text-white hover:bg-neutral-800" onclick={loginGitHub}>
            <GithubIcon class="mr-2" />
            Log in with GitHub
          </Button>
        {/if}
      </div>
      <div class="flex flex-col gap-1">
        <label for="repo">Repository (user/repo)</label>
        {#if $githubUserStore}
          <select
            id="repo"
            class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={repo}
            onchange={(event) => handleRepoChange(event.currentTarget.value)}>
            <option value="" disabled>Select a repository</option>
            {#each $githubReposStore as repository (repository.fullName)}
              <option value={repository.fullName}>
                {repository.fullName}{repository.private ? ' (private)' : ''}
              </option>
            {/each}
          </select>
        {:else}
          <Input id="repo" value={repo} placeholder="Log in to choose a repository" disabled />
        {/if}
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
        {#if !$githubUserStore}
          <p>Log in with GitHub to load diagrams.</p>
          <Button size="sm" class="bg-black text-white hover:bg-neutral-800" onclick={loginGitHub}>
            <GithubIcon class="mr-2" />
            Log in with GitHub
          </Button>
        {:else if !$githubConfigStore.repo}
          <p>Select a repository to load diagrams.</p>
          <p class="text-xs">Open settings above to choose a repo.</p>
        {:else}
          <p>No .mmd files found.</p>
          <p class="text-xs">Check the repository path above or save a new diagram.</p>
        {/if}
      </div>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each $githubFilesStore as file (file.path)}
          <li
            class="group flex items-center justify-between gap-2 rounded-md border p-2 transition-colors
              {$stateStore.originalFilename === file.name || $stateStore.filename === file.name
              ? 'border-primary/50 bg-primary/10 text-primary-foreground dark:border-primary/30 dark:bg-primary/20'
              : 'hover:bg-accent hover:text-accent-foreground'}">
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left"
              onclick={() => loadDiagram(file)}
              disabled={loading || deletingFile === file.name}>
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
            </button>
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
