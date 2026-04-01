<script lang="ts" module>
  import { logEvent } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import MainMenu from '$/components/MainMenu.svelte';
  import { Separator } from '$/components/ui/separator';
  import type { ComponentProps, Snippet } from 'svelte';
  import DiagramTitle from './DiagramTitle.svelte';
  import GithubIcon from '~icons/mdi/github';
  import DropdownNavMenu from './DropdownNavMenu.svelte';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
  }

  let { children, mobileToggle }: Props = $props();

  type Links = ComponentProps<typeof DropdownNavMenu>['links'];

  const githubLinks: Links = [
    { title: 'Mermaid JS', href: 'https://github.com/mermaid-js/mermaid' },
    {
      title: 'Mermaid Live Editor',
      href: 'https://github.com/mermaid-js/mermaid-live-editor'
    },
    {
      title: 'Mermaid CLI',
      href: 'https://github.com/mermaid-js/mermaid-cli'
    }
  ];
</script>

<nav class="z-50 flex items-center gap-1 p-2 sm:gap-4 sm:p-6">
  <div class="flex flex-1 items-center gap-2 overflow-hidden">
    <MainMenu />
    <DiagramTitle />
  </div>
  <div id="menu" class="flex flex-nowrap items-center justify-between gap-3 overflow-hidden">
    <div class="hidden items-center gap-3 md:flex">
      <DropdownNavMenu icon={GithubIcon} links={githubLinks} />
      <Separator orientation="vertical" />
    </div>
    {@render children()}
  </div>
  {@render mobileToggle?.()}
</nav>
