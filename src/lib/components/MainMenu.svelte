<script lang="ts">
  import * as Popover from '$/components/ui/popover';
  import { Switch } from '$/components/ui/switch';
  import { env } from '$/util/env';
  import { defaultState } from '$/util/state';
  import { serializeState } from '$/util/serde';
  import { generateDiagramName } from '$/util/naming';
  import { cn } from '$/utils';
  import { mode, setMode } from 'mode-watcher';
  import type { Component, Snippet } from 'svelte';
  import MermaidTailIcon from '~icons/custom/mermaid-tail';
  import AddIcon from '~icons/material-symbols/add-2-rounded';
  import BookIcon from '~icons/material-symbols/book-2-outline-rounded';
  import DuplicateIcon from '~icons/material-symbols/content-copy-outline-rounded';
  import ContrastIcon from '~icons/material-symbols/contrast';
  import MenuIcon from '~icons/material-symbols/menu-rounded';
  import CommunityIcon from '~icons/material-symbols/person-play-outline-rounded';
  import AISettingsModal from './AISettingsModal.svelte';
  import SparklesIcon from '~icons/material-symbols/kid-star-outline';

  interface MenuItem {
    label: string;
    icon: Component;
    href: string;
    class?: string;
    onclick?: () => void;
    sharesData?: boolean;
    checkDiagramType?: boolean;
    isSectionEnd?: boolean;
    renderer: (item: Omit<MenuItem, 'renderer'>) => ReturnType<Snippet>;
  }

  let showAISettings = $state(false);

  const menuItems: MenuItem[] = $derived([
    {
      href: '#',
      icon: AddIcon,
      label: 'New',
      onclick: () => {
        const newState = { ...defaultState, title: generateDiagramName() };
        window.location.hash = serializeState(newState);
      },
      renderer: menuItem
    },
    { href: window.location.href, icon: DuplicateIcon, label: 'Duplicate', renderer: menuItem },
    {
      href: '#',
      icon: SparklesIcon,
      isSectionEnd: true,
      label: 'AI Settings',
      onclick: () => (showAISettings = true),
      renderer: menuItem
    },
    {
      href: env.docsUrl,
      icon: MermaidTailIcon,
      label: 'Mermaid.js',
      renderer: menuItem
    },
    {
      href: `${env.docsUrl}/intro/`,
      icon: BookIcon,
      label: 'Documentation',
      renderer: menuItem
    },
    {
      href: 'https://discord.gg/sKeNQX4Wtj',
      icon: CommunityIcon,
      label: 'Community',
      renderer: menuItem
    },
    {
      href: '#',
      icon: ContrastIcon,
      isSectionEnd: true,
      label: 'Dark Mode',
      renderer: darkModeMenuItem
    }
  ]);
</script>

{#snippet menuItem(options: MenuItem)}
  <a
    href={options.href}
    target={options.href.startsWith('http') ? '_blank' : undefined}
    onclick={(e) => {
      if (options.onclick) {
        options.onclick();
        if (options.href === '#' || options.href.includes(window.location.host)) {
          e.preventDefault();
        }
      }
    }}
    class={cn(
      'flex items-center justify-start gap-2 border-b-2 p-2 px-3 hover:bg-muted',
      options.isSectionEnd && 'border-border-dark',
      options.class
    )}>
    <options.icon class="size-5" />
    {options.label}
  </a>
{/snippet}

{#snippet darkModeMenuItem(options: MenuItem)}
  <div
    class={cn(
      'flex cursor-pointer items-center justify-between border-b-2 px-3 py-2 hover:bg-muted',
      options.isSectionEnd && 'border-border-dark',
      options.class
    )}>
    <span class="flex items-center gap-2">
      <ContrastIcon />
      Dark Mode
    </span>
    <Switch
      checked={$mode === 'dark'}
      onCheckedChange={(dark) => setMode(dark ? 'dark' : 'light')} />
  </div>
{/snippet}

<Popover.Root>
  <Popover.Trigger class="shrink-0">
    <MenuIcon class="size-6" />
  </Popover.Trigger>
  <Popover.Content align="start" class="flex flex-col overflow-hidden border-2 p-0" sideOffset={16}>
    {#each menuItems as { renderer, ...item } (item.label)}
      {@render renderer(item)}
    {/each}
  </Popover.Content>
</Popover.Root>

<AISettingsModal bind:open={showAISettings} />
