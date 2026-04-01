<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import * as ToggleGroup from '$/components/ui/toggle-group';
  import { aiConfigStore, updateAIConfig, type AIProvider } from '$lib/util/aiConfig';
  import SparklesIcon from '~icons/material-symbols/kid-star-outline';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  let provider = $state<AIProvider>($aiConfigStore.provider);
  let geminiKey = $state($aiConfigStore.geminiKey);
  let openaiKey = $state($aiConfigStore.openaiKey);
  let model = $state($aiConfigStore.model);

  const save = () => {
    updateAIConfig({
      geminiKey,
      openaiKey,
      provider,
      model
    });
    open = false;
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <SparklesIcon class="text-accent" />
        AI Naming Settings
      </Dialog.Title>
      <Dialog.Description>
        Configure your AI provider to enable automatic diagram naming. Your API keys are stored
        locally in your browser.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-6 py-4">
      <div class="grid gap-3">
        <label for="provider" class="text-sm font-medium">AI Provider</label>
        <ToggleGroup.Root bind:value={provider} class="flex gap-2" type="single" variant="outline">
          <ToggleGroup.Item value="gemini" class="flex-1">Google Gemini</ToggleGroup.Item>
          <ToggleGroup.Item value="openai" class="flex-1">OpenAI</ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>

      <div class="grid gap-2">
        <label for="model" class="flex items-center justify-between text-sm font-medium">
          Model Name
          <Button
            variant="link"
            class="h-auto p-0 text-[10px] text-accent"
            onclick={() => (model = provider === 'gemini' ? 'gemini-3.1-flash' : 'gpt-4o-mini')}>
            Reset to default
          </Button>
        </label>
        <Input
          id="model"
          list="model-suggestions"
          bind:value={model}
          placeholder="Enter model ID" />
        <datalist id="model-suggestions">
          {#if provider === 'gemini'}
            <option value="gemini-3.1-pro-preview"></option>
            <option value="gemini-3.1-flash-preview"></option>
            <option value="gemini-2.5-pro"></option>
            <option value="gemini-2.5-flash"></option>
          {:else}
            <option value="gpt-4o-mini"></option>
            <option value="gpt-4o"></option>
            <option value="o1-preview"></option>
          {/if}
        </datalist>

        <div class="mt-1 flex flex-wrap gap-1.5">
          {#each provider === 'gemini' ? ['gemini-3.1-pro-preview', 'gemini-3.1-flash-preview', 'gemini-2.5-flash'] : ['gpt-4o-mini', 'gpt-4o', 'o1-preview'] as m (m)}
            <button
              class="rounded-full border border-accent/20 bg-accent/5 px-2.5 py-0.5 text-[11px] font-medium transition-all hover:bg-accent/20 hover:text-accent {model ===
              m
                ? 'border-accent bg-accent text-white hover:bg-accent hover:text-white'
                : 'text-accent-foreground/70'}"
              onclick={() => (model = m)}>
              {m.replace('gemini-', '').replace('gpt-', '').replace('-preview', '')}
              {#if m.includes('preview')}
                <span class="ml-1 text-[8px] opacity-60">PREVIEW</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#if provider === 'gemini'}
        <div class="grid gap-2">
          <label for="geminiKey" class="text-sm font-medium">Gemini API Key</label>
          <Input
            id="geminiKey"
            type="password"
            bind:value={geminiKey}
            placeholder="Enter AI Studio API Key" />
          <p class="text-[10px] text-muted-foreground">
            Get a free key at <a
              href="https://aistudio.google.com/"
              target="_blank"
              class="text-accent underline decoration-accent/50">Google AI Studio</a>
          </p>
        </div>
      {:else}
        <div class="grid gap-2">
          <label for="openaiKey" class="text-sm font-medium">OpenAI API Key</label>
          <Input id="openaiKey" type="password" bind:value={openaiKey} placeholder="sk-..." />
        </div>
      {/if}

      <div
        class="border-l-2 border-accent/30 bg-accent/5 p-3 text-[11px] leading-relaxed text-accent-foreground/80">
        <strong>Privacy Note:</strong> This is a static application. All AI requests are made directly
        from your browser to the provider's API. Your keys never touch our servers.
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={save}>Save Settings</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
