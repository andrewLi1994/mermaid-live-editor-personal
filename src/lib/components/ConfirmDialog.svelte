<script lang="ts">
  import * as Dialog from '$/components/ui/dialog';
  import { Button } from '$/components/ui/button';
  import WarningIcon from '~icons/material-symbols/warning-outline-rounded';

  interface Props {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onconfirm: () => void;
    oncancel?: () => void;
  }

  let {
    open = $bindable(),
    title = 'Confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onconfirm,
    oncancel
  }: Props = $props();

  const handleConfirm = () => {
    open = false;
    onconfirm();
  };

  const handleCancel = () => {
    open = false;
    oncancel?.();
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="sm:max-w-[400px]"
    onInteractOutside={handleCancel}
    onEscapeKeydown={handleCancel}>
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <WarningIcon class="size-5 text-destructive" />
        {title}
      </Dialog.Title>
      <Dialog.Description>
        {message}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="flex gap-2 sm:justify-end">
      <Button variant="outline" onclick={handleCancel}>{cancelLabel}</Button>
      <Button variant="destructive" onclick={handleConfirm}>{confirmLabel}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
