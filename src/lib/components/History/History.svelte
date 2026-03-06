<script lang="ts">
  import Card from '$lib/components/Card/Card.svelte';
  import type { HistoryEntry, HistoryType, State, Tab } from '$lib/types';
  import { notify, prompt } from '$lib/util/notify';
  import { getStateString, inputStateStore } from '$lib/util/state';
  import { logEvent } from '$lib/util/stats';
  import dayjs from 'dayjs';
  import dayjsRelativeTime from 'dayjs/plugin/relativeTime';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import BookmarkIcon from '~icons/material-symbols/bookmark-outline-rounded';
  import TrashAltIcon from '~icons/material-symbols/delete-outline-rounded';
  import DownloadIcon from '~icons/material-symbols/download-rounded';
  import MoreIcon from '~icons/material-symbols/more-vert';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';
  import UndoIcon from '~icons/material-symbols/settings-backup-restore-rounded';
  import UploadIcon from '~icons/material-symbols/upload-rounded';
  import HistoryIcon from '~icons/mdi/clock-outline';
  import GitAltIcon from '~icons/mdi/git';
  import GitExplorer from '../GitExplorer.svelte';
  import { Button } from '../ui/button';
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
  import { Separator } from '../ui/separator';
  import {
    addHistoryEntry,
    clearHistoryData,
    getPreviousState,
    historyModeStore,
    historyStore,
    loaderHistoryStore,
    restoreHistory
  } from './history';

  dayjs.extend(dayjsRelativeTime);

  const HISTORY_SAVE_INTERVAL = 60_000;

  const tabSelectHandler = (tab: Tab) => {
    historyModeStore.set(tab.id as HistoryType);
  };

  let tabs: Tab[] = $state([
    {
      id: 'manual',
      title: 'Saved',
      icon: BookmarkIcon
    },
    {
      id: 'auto',
      title: 'Timeline',
      icon: HistoryIcon
    },
    {
      id: 'git',
      title: 'Git',
      icon: GitAltIcon
    }
  ]);

  const downloadHistory = () => {
    const data = get(historyStore);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-history-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('history', {
      action: 'download'
    });
  };

  const uploadHistory = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async ({ target }: Event) => {
      const file = (target as HTMLInputElement)?.files?.[0];
      if (!file) {
        return;
      }
      const data: HistoryEntry[] = JSON.parse(await file.text());
      restoreHistory(data);
    });
    input.click();
  };

  const saveHistory = (auto = false) => {
    const currentState: string = getStateString();
    const previousState: string = getPreviousState(auto);
    if (previousState !== currentState) {
      addHistoryEntry({
        state: $inputStateStore,
        time: Date.now(),
        type: auto ? 'auto' : 'manual'
      });
    } else if (!auto) {
      notify('State already saved.');
    }
  };

  const clearHistory = (id?: string): void => {
    if (!id && !prompt('Clear all saved items?')) {
      return;
    }
    clearHistoryData(id);
  };

  const restoreHistoryItem = (state: State): void => {
    inputStateStore.set({ ...state, updateDiagram: true });
  };

  onMount(() => {
    historyModeStore.set('manual');
    setInterval(() => {
      saveHistory(true);
    }, HISTORY_SAVE_INTERVAL);
  });

  loaderHistoryStore.subscribe((entries) => {
    if (entries.length > 0 && tabs.length === 2) {
      tabs = [
        {
          id: 'loader',
          title: 'Revisions',
          icon: GitAltIcon
        },
        ...tabs
      ];
      historyModeStore.set('loader');
    }
  });
</script>

<Card onselect={tabSelectHandler} isOpen isClosable={false} {tabs}>
  {#snippet actions()}
    <div class="flex items-center gap-1">
      <Button
        id="saveHistory"
        size="icon"
        variant="ghost"
        onclick={() => saveHistory()}
        title="Save current state"><SaveIcon /></Button>

      <Popover>
        <PopoverTrigger>
          <Button size="icon" variant="ghost" title="More actions">
            <MoreIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="flex w-fit flex-col gap-1 p-1">
          <Button
            variant="ghost"
            class="justify-start gap-2 px-3"
            id="uploadHistory"
            onclick={uploadHistory}>
            <UploadIcon class="h-4 w-4" />
            Upload history
          </Button>
          {#if $historyStore.length > 0}
            <Button
              id="downloadHistory"
              variant="ghost"
              class="justify-start gap-2 px-3"
              onclick={downloadHistory}>
              <DownloadIcon class="h-4 w-4" />
              Download history
            </Button>
          {/if}
          {#if $historyModeStore !== 'loader'}
            <Separator class="my-1" />
            <Button
              id="clearHistory"
              variant="ghost"
              class="justify-start gap-2 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onclick={() => clearHistory()}>
              <TrashAltIcon class="h-4 w-4" />
              Clear all
            </Button>
          {/if}
        </PopoverContent>
      </Popover>
    </div>
  {/snippet}
  <ul class="flex h-full min-w-fit flex-col gap-2 overflow-auto p-2" id="historyList">
    {#if $historyModeStore === 'git'}
      <GitExplorer />
    {:else if $historyStore.length > 0}
      {#each $historyStore as { id, state, time, name, url, type } (id)}
        <li class="flex flex-col gap-2">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-col">
              {#if url}
                <a
                  href={url}
                  target="_blank"
                  title="Open revision in new tab"
                  class="text-blue-500 hover:underline">{name}</a>
              {:else}
                <span
                  class="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-none"
                  >{name}</span>
              {/if}
              <span class="text-xs whitespace-nowrap text-primary-foreground/30 sm:block">
                {new Date(time).toLocaleString()}
              </span>
            </div>

            <div class="flex items-center justify-between gap-2 sm:justify-end">
              <span class="text-sm whitespace-nowrap text-primary-foreground/50">
                {dayjs(time).fromNow()}
              </span>
              <div class="flex items-center gap-1">
                <Button size="icon" variant="ghost" onclick={() => restoreHistoryItem(state)}>
                  <UndoIcon />
                </Button>
                {#if type !== 'loader'}
                  <Button
                    size="icon"
                    variant="ghost"
                    class="hover:text-destructive"
                    onclick={() => clearHistory(id)}>
                    <TrashAltIcon />
                  </Button>
                {/if}
              </div>
            </div>
          </div>
          <Separator />
        </li>
      {/each}
    {:else}
      <div class="m-2 text-center">
        No items in History<br />
        Click the Save button to save current state and restore it later.<br />
        Timeline will automatically be saved every minute.
      </div>
    {/if}
  </ul>
</Card>
