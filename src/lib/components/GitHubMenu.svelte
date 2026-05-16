<script lang="ts">
  import {
    githubReposStore,
    githubUserStore,
    getGitHubUser,
    listDiagrams,
    listRepositories,
    loginGitHub,
    logoutGitHub
  } from '$lib/util/github';
  import { githubConfigStore } from '$lib/util/githubConfig';
  import { notify } from '$lib/util/notify';
  import { onMount } from 'svelte';
  import FolderIcon from '~icons/material-symbols/folder-open-outline';
  import RefreshIcon from '~icons/material-symbols/refresh-rounded';
  import GithubIcon from '~icons/mdi/github';
  import { Button } from './ui/button';
  import { Input } from './ui/input';
  import * as Popover from './ui/popover';

  interface Props {
    onopenGitPanel?: () => void;
  }

  let { onopenGitPanel }: Props = $props();

  let loading = $state(false);
  let repo = $state($githubConfigStore.repo);
  let path = $state($githubConfigStore.path);

  const syncConfig = () => {
    githubConfigStore.set({ path, repo });
  };

  const refreshDiagrams = async () => {
    if (!$githubUserStore || !repo) {
      return;
    }

    loading = true;
    try {
      syncConfig();
      await listDiagrams();
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      loading = false;
    }
  };

  const loadRepositories = async () => {
    if (!$githubUserStore) {
      return;
    }

    loading = true;
    try {
      const repositories = await listRepositories();
      if (!repo && repositories.length > 0) {
        repo = repositories[0].fullName;
        syncConfig();
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
      await loadRepositories();
    } catch {
      githubUserStore.set(null);
      githubReposStore.set([]);
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

  const saveSettings = () => {
    syncConfig();
    void refreshDiagrams();
    notify('GitHub repository settings saved');
  };

  const handleRepoChange = (value: string) => {
    repo = value;
    syncConfig();
    void refreshDiagrams();
  };

  $effect(() => {
    repo = $githubConfigStore.repo;
    path = $githubConfigStore.path;
  });

  onMount(() => {
    void initializeGitHub();
  });
</script>

<Popover.Root>
  <Popover.Trigger class="flex items-center gap-0">
    <Button variant="ghost" size="sm" title="GitHub">
      <GithubIcon />
    </Button>
  </Popover.Trigger>
  <Popover.Content align="end" class="w-80 p-3">
    <div class="flex flex-col gap-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2 font-semibold">
          <GithubIcon class="size-5 shrink-0" />
          <span class="truncate">GitHub</span>
        </div>
        {#if $githubUserStore}
          <Button size="sm" variant="outline" onclick={disconnectGitHub}>Disconnect</Button>
        {/if}
      </div>

      {#if $githubUserStore}
        <div class="flex items-center justify-between gap-3 rounded-md border bg-secondary/20 p-2">
          <div class="min-w-0">
            <div class="truncate font-medium">{$githubUserStore.login}</div>
            <div class="truncate text-xs text-muted-foreground">Connected with GitHub OAuth</div>
          </div>
          {#if $githubUserStore.avatarUrl}
            <img
              src={$githubUserStore.avatarUrl}
              alt=""
              class="size-8 shrink-0 rounded-full border" />
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="github-menu-repo" class="text-xs font-medium text-muted-foreground">
            Repository
          </label>
          <select
            id="github-menu-repo"
            class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={repo}
            disabled={loading}
            onchange={(event) => handleRepoChange(event.currentTarget.value)}>
            <option value="" disabled>Select a repository</option>
            {#each $githubReposStore as repository (repository.fullName)}
              <option value={repository.fullName}>
                {repository.fullName}{repository.private ? ' (private)' : ''}
              </option>
            {/each}
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="github-menu-path" class="text-xs font-medium text-muted-foreground">
            Path in repo
          </label>
          <Input id="github-menu-path" bind:value={path} placeholder="diagrams" />
        </div>

        <div class="flex items-center gap-2">
          <Button size="sm" class="flex-1" onclick={saveSettings} disabled={loading || !repo}>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="gap-2"
            onclick={refreshDiagrams}
            disabled={loading || !repo}>
            <RefreshIcon class={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {#if onopenGitPanel}
          <Button
            size="sm"
            variant="ghost"
            class="justify-start gap-2"
            onclick={() => onopenGitPanel?.()}>
            <FolderIcon class="size-4" />
            Open repository panel
          </Button>
        {/if}
      {:else}
        <div class="rounded-md border bg-secondary/20 p-3 text-xs text-muted-foreground">
          Log in with GitHub to choose a repository and sync Mermaid diagrams.
        </div>
        <Button class="bg-black text-white hover:bg-neutral-800" onclick={loginGitHub}>
          <GithubIcon class="mr-2" />
          Log in with GitHub
        </Button>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
