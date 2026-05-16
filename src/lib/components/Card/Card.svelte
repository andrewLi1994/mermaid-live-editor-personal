<script lang="ts">
  import type { Tab } from '$/types';
  import type { Component, Snippet } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import CollapseAllIcon from '~icons/material-symbols/collapse-all-rounded';
  import ExpandAllIcon from '~icons/material-symbols/expand-all-rounded';
  import { Button } from '../ui/button';
  import Tabs from './Tabs.svelte';

  interface Props {
    isClosable?: boolean;
    isMinimizable?: boolean;
    isOpen?: boolean;
    isStackable?: boolean;
    tabs?: Tab[];
    activeTabID?: string;
    title?: string;
    icon?: {
      component: Component;
      class?: string;
    };
    onselect?: (tab: Tab) => void;
    onopenchange?: (isOpen: boolean) => void;
    actions?: Snippet;
    children: Snippet;
  }

  let {
    isClosable = true,
    isMinimizable = false,
    isOpen = false,
    isStackable = false,
    tabs = [],
    activeTabID = '',
    title,
    icon,
    onselect,
    onopenchange,
    actions,
    children
  }: Props = $props();

  const setIsOpen = (nextIsOpen: boolean) => {
    isOpen = nextIsOpen;
    onopenchange?.(isOpen);
  };

  const toggleCardOpen = () => {
    if (isClosable) {
      setIsOpen(!isOpen);
    }
  };

  const toggleMinimized = (event: MouseEvent) => {
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  let isTabsShown = $derived(isOpen && tabs.length > 0);
</script>

<div
  class={[
    'card flex h-fit flex-col overflow-hidden rounded-2xl border-2 border-muted',
    isOpen && 'isOpen flex-grow',
    isStackable ? 'flex-1 group-has-[.isOpen]:w-full group-has-[.isOpen]:flex-none' : 'w-full'
  ]}>
  <div
    role="toolbar"
    tabindex="0"
    class={[
      'flex h-11 flex-none cursor-pointer items-center justify-between gap-2 overflow-hidden bg-muted p-2 whitespace-nowrap',
      isTabsShown && 'pb-1'
    ]}
    onclick={toggleCardOpen}
    onkeypress={toggleCardOpen}>
    {#if icon || title}
      <span role="menubar" tabindex="0" class="flex flex-shrink-0 items-center gap-3">
        {#if icon}
          <icon.component class={icon.class} />
        {/if}
        {title}
      </span>
    {/if}
    {#if (isOpen && tabs && tabs.length > 0) || (isOpen && actions)}
      <div class="scrollbar-none flex flex-grow items-center gap-2 overflow-x-auto">
        {#if isOpen && tabs && tabs.length > 0}
          <Tabs {onselect} {tabs} {activeTabID} />
        {/if}

        {#if isOpen && actions}
          <div
            class="flex items-center gap-2"
            onclick={(e) => e.stopPropagation()}
            onkeypress={(e) => e.stopPropagation()}
            role="none">
            {@render actions?.()}
          </div>
        {/if}
      </div>
    {/if}

    {#if isMinimizable || (isOpen && isClosable)}
      <div class="flex flex-shrink-0 items-center">
        {#if isMinimizable}
          <Button
            variant="ghost"
            size="icon"
            title={isOpen ? 'Minimize panel' : 'Restore panel'}
            onclick={toggleMinimized}>
            {#if isOpen}
              <CollapseAllIcon />
            {:else}
              <ExpandAllIcon />
            {/if}
          </Button>
        {:else}
          <CollapseAllIcon />
        {/if}
      </div>
    {/if}
  </div>
  {#if isOpen}
    <div class="flex-grow overflow-x-auto" transition:slide={{ easing: quintOut }}>
      {@render children()}
    </div>
  {/if}
</div>
