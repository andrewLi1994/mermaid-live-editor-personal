<script lang="ts">
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { githubFilesStore } from '$lib/util/github';
  import { suggestFilename } from '$lib/util/ai';
  import { aiConfigStore } from '$lib/util/aiConfig';
  import { Button } from '$/components/ui/button';
  import { Input } from '$/components/ui/input';
  import AISettingsModal from './AISettingsModal.svelte';
  import { notify } from '$lib/util/notify';
  import RenameIcon from '~icons/material-symbols/drive-file-rename-outline-rounded';
  import LoadingIcon from '~icons/material-symbols/refresh-rounded';
  import WarningIcon from '~icons/material-symbols/warning-outline-rounded';

  let isEditing = $state(false);
  let isLoading = $state(false);
  let showSettings = $state(false);
  let inputRef = $state<HTMLInputElement>();

  let title = $derived($stateStore.title || 'Untitled Diagram');

  // Collision: current filename matches an existing git file that isn't the one originally loaded
  const hasCollision = $derived(
    $githubFilesStore.some(
      (f) =>
        f.name.toLowerCase() === ($stateStore.filename || '').toLowerCase() &&
        f.name.toLowerCase() !== ($stateStore.originalFilename || '').toLowerCase()
    )
  );

  const startEditing = () => {
    isEditing = true;
    setTimeout(() => inputRef?.focus(), 0);
  };

  const stopEditing = (e?: FocusEvent | KeyboardEvent) => {
    if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== 'Escape') return;
    isEditing = false;
  };

  const handleAI = async (e: MouseEvent) => {
    e.stopPropagation();
    const config = $aiConfigStore;
    if (
      (config.provider === 'gemini' && !config.geminiKey) ||
      (config.provider === 'openai' && !config.openaiKey)
    ) {
      showSettings = true;
      return;
    }

    isLoading = true;
    try {
      const suggested = await suggestFilename($stateStore.code);
      updateCodeStore({ title: suggested });
      notify(`AI suggested: ${suggested}`);
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="flex items-center gap-1 px-1 sm:gap-2 sm:px-2">
  <div class="hidden h-4 w-[1px] bg-border sm:block"></div>

  <div class="group relative flex items-center gap-1">
    {#if isEditing}
      <div class="flex items-center gap-1">
        <Input
          bind:ref={inputRef}
          class="h-7 w-48 bg-background/50 px-2 py-0 text-sm focus:ring-accent {hasCollision
            ? 'border-orange-400 focus:ring-orange-400'
            : ''}"
          value={$stateStore.title}
          oninput={(e) => updateCodeStore({ title: e.currentTarget.value })}
          onblur={stopEditing}
          onkeydown={stopEditing}
          placeholder="Untitled Diagram" />
        {#if hasCollision}
          <span
            title="A file with this name already exists in the repository. Saving will overwrite it.">
            <WarningIcon class="size-4 shrink-0 text-orange-500" />
          </span>
        {/if}
      </div>
    {:else}
      <button
        class="max-w-[100px] truncate rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent/10 focus:ring-1 focus:ring-accent focus:outline-none sm:max-w-xs {hasCollision
          ? 'text-orange-500'
          : ''}"
        onclick={startEditing}
        title={hasCollision
          ? 'Warning: this name already exists in GitHub. Click to rename.'
          : 'Click to rename'}>
        {title}
        {#if hasCollision}
          <WarningIcon class="inline size-3.5 text-orange-500" />
        {/if}
      </button>
    {/if}

    <Button
      variant="ghost"
      size="icon"
      class="h-7 w-7 transition-all hover:bg-accent/20 hover:text-accent {$stateStore.title
        ? 'opacity-30 group-hover:opacity-100'
        : 'opacity-100'}"
      onclick={handleAI}
      disabled={isLoading}
      title="Magic Rename (AI)">
      {#if isLoading}
        <LoadingIcon class="size-4 animate-spin" />
      {:else}
        <RenameIcon class="size-4" />
      {/if}
    </Button>
  </div>
</div>

<AISettingsModal bind:open={showSettings} />
