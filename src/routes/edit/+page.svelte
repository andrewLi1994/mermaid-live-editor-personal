<script lang="ts">
  import Actions from '$/components/Actions.svelte';
  import Card from '$/components/Card/Card.svelte';
  import DiagramDocButton from '$/components/DiagramDocumentationButton.svelte';
  import Editor from '$/components/Editor.svelte';
  import History from '$/components/History/History.svelte';
  import Navbar from '$/components/Navbar.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import Preset from '$/components/Preset.svelte';
  import Share from '$/components/Share.svelte';
  import SyncRoughToolbar from '$/components/SyncRoughToolbar.svelte';
  import { Button } from '$/components/ui/button';
  import * as Resizable from '$/components/ui/resizable';
  import { Switch } from '$/components/ui/switch';
  import { Toggle } from '$/components/ui/toggle';
  import VersionSecurityToolbar from '$/components/VersionSecurityToolbar.svelte';
  import View from '$/components/View.svelte';
  import type { EditorMode, Tab } from '$/types';
  import { githubFilesStore, saveDiagram } from '$/util/github';
  import { notify } from '$/util/notify';
  import { PanZoomState } from '$/util/panZoom';
  import { stateStore, updateCodeStore } from '$/util/state';
  import { logEvent } from '$/util/stats';
  import { initHandler } from '$/util/util';
  import { onMount } from 'svelte';
  import CodeIcon from '~icons/custom/code';
  import HistoryIcon from '~icons/material-symbols/history';
  import GearIcon from '~icons/material-symbols/settings-outline-rounded';

  const panZoomState = new PanZoomState();

  const tabSelectHandler = (tab: Tab) => {
    const editorMode: EditorMode = tab.id === 'code' ? 'code' : 'config';
    updateCodeStore({ editorMode });
  };

  const editorTabs: Tab[] = [
    {
      icon: CodeIcon,
      id: 'code',
      title: 'Code'
    },
    {
      icon: GearIcon,
      id: 'config',
      title: 'Config'
    }
  ];

  let width = $state(0);
  let isMobile = $derived(width < 640);
  let isViewMode = $state(true);

  onMount(async () => {
    await initHandler();
    window.addEventListener('appinstalled', () => {
      logEvent('pwaInstalled', { isMobile });
    });
  });

  let isHistoryOpen = $state(false);

  let editorPane: Resizable.Pane | undefined;
  $effect(() => {
    if (isMobile) {
      editorPane?.resize(50);
    }
  });

  const saveAction = async (saveAsCopy = false) => {
    const { filename, code, originalFilename } = $stateStore;
    if (!filename) {
      notify('Please specify a filename in the Git tab.');
      return;
    }
    try {
      await saveDiagram(filename, code, { originalFilename, saveAsCopy });
      updateCodeStore({ lastActionTimestamp: Date.now() });
      notify(saveAsCopy ? `Saved copy to ${filename}` : `Saved ${filename} to GitHub`);
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  // Collision detection: does the current filename match an existing file that isn't the one we loaded?
  const isNameChanged = $derived(
    !!$stateStore.originalFilename && $stateStore.filename !== $stateStore.originalFilename
  );
  const hasCollision = $derived(
    $githubFilesStore.some(
      (f) =>
        f.name.toLowerCase() === ($stateStore.filename || '').toLowerCase() &&
        f.name.toLowerCase() !== ($stateStore.originalFilename || '').toLowerCase()
    )
  );

  const getSaveButtonLabel = () => {
    if (isMobile) {
      if (isNameChanged && hasCollision) return 'Overwrite';
      if (isNameChanged) return 'Rename';
      return 'Save';
    }
    if (isNameChanged && hasCollision) return 'Overwrite & Save';
    if (isNameChanged) return 'Rename & Save';
    return 'Save to Git';
  };
</script>

<div class="flex h-full flex-col overflow-hidden">
  {#snippet mobileToggle()}
    <div class="flex shrink-0 items-center gap-2 text-sm">
      <span class="hidden font-medium sm:inline">Edit</span>
      <Switch
        id="editorMode"
        class="scale-90 data-[state=checked]:bg-accent"
        bind:checked={isViewMode}
        onclick={() => {
          logEvent('mobileViewToggle');
        }} />
      <span class="hidden font-medium sm:inline">View</span>
    </div>
  {/snippet}

  <Navbar mobileToggle={isMobile ? mobileToggle : undefined}>
    <Toggle bind:pressed={isHistoryOpen} size="sm">
      <HistoryIcon />
    </Toggle>
    <div class="hidden md:block">
      <Share />
    </div>
    <div class="flex items-center gap-2">
      {#if isNameChanged}
        <Button
          variant="outline"
          size="sm"
          class="hidden lg:flex"
          onclick={() => saveAction(true)}
          title="Save as a new copy, keeping the original file">
          Save as Copy
        </Button>
      {/if}
      {#if hasCollision}
        <span
          class="hidden text-[10px] font-semibold text-orange-500 lg:inline"
          title="A file with this name already exists">
          ⚠ Conflict
        </span>
      {/if}
      <Button
        variant={hasCollision ? 'destructive' : 'accent'}
        size="sm"
        onclick={() => saveAction(false)}>
        <span class="inline">
          {getSaveButtonLabel()}
        </span>
      </Button>
    </div>
  </Navbar>

  <div class="flex flex-1 flex-col overflow-hidden" bind:clientWidth={width}>
    <div
      class={[
        'size-full',
        isMobile && ['w-[200%] duration-300', isViewMode && '-translate-x-1/2']
      ]}>
      <Resizable.PaneGroup
        direction="horizontal"
        autoSaveId="liveEditor"
        class="gap-4 p-2 pt-0 sm:gap-0 sm:p-6 sm:pt-0">
        <Resizable.Pane bind:this={editorPane} defaultSize={30} minSize={15}>
          <div class="flex h-full flex-col gap-4 sm:gap-6">
            <Card
              onselect={tabSelectHandler}
              isOpen
              tabs={editorTabs}
              activeTabID={$stateStore.editorMode}
              isClosable={false}>
              {#snippet actions()}
                <DiagramDocButton />
              {/snippet}
              <Editor {isMobile} />
            </Card>

            <div class="group flex flex-wrap justify-between gap-4 sm:gap-6">
              <Preset />
              <Actions />
            </div>
          </div>
        </Resizable.Pane>
        <Resizable.Handle class="mr-1 hidden opacity-0 sm:block" />
        <Resizable.Pane minSize={15} class="relative flex h-full flex-1 flex-col overflow-hidden">
          <View {panZoomState} shouldShowGrid={$stateStore.grid} />
          <div class="absolute top-0 right-0"><PanZoomToolbar {panZoomState} /></div>
          <div class="absolute right-0 bottom-0"><VersionSecurityToolbar /></div>
          <div class="absolute bottom-0 left-0 sm:left-5"><SyncRoughToolbar /></div>
        </Resizable.Pane>
        {#if isHistoryOpen}
          <Resizable.Handle class="ml-1 hidden opacity-0 sm:block" />
          <Resizable.Pane minSize={15} defaultSize={30} class="flex h-full grow flex-col">
            <History />
          </Resizable.Pane>
        {/if}
      </Resizable.PaneGroup>
    </div>
  </div>
</div>
