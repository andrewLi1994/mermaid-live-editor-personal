<script lang="ts">
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { suggestFilename } from '$lib/util/ai';
  import { aiConfigStore } from '$lib/util/aiConfig';
  import { Button } from '$/components/ui/button';
  import { Input } from '$/components/ui/input';
  import AISettingsModal from './AISettingsModal.svelte';
  import { notify } from '$lib/util/notify';
  import RenameIcon from '~icons/material-symbols/drive-file-rename-outline-rounded';
  import LoadingIcon from '~icons/material-symbols/refresh-rounded';

  let isEditing = $state(false);
  let isLoading = $state(false);
  let showSettings = $state(false);
  let inputRef = $state<HTMLInputElement>();

  let title = $derived($stateStore.title || 'Untitled Diagram');

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

<div class="flex items-center gap-2 px-2">
  <div class="hidden h-4 w-[1px] bg-border sm:block"></div>

  <div class="group relative flex items-center gap-1">
    {#if isEditing}
      <Input
        bind:ref={inputRef}
        class="h-7 w-48 bg-background/50 px-2 py-0 text-sm focus:ring-accent"
        value={$stateStore.title}
        oninput={(e) => updateCodeStore({ title: e.currentTarget.value })}
        onblur={stopEditing}
        onkeydown={stopEditing}
        placeholder="Untitled Diagram" />
    {:else}
      <button
        class="rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent/10 focus:ring-1 focus:ring-accent focus:outline-none"
        onclick={startEditing}
        title="Click to rename">
        {title}
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
