'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

/**
 * Closes a drop-down or popover on Escape or a click/tap outside `ref`.
 * Put the button that opens it inside `ref` too, so that button can still
 * toggle it.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, isOpen: boolean, onDismiss: () => void) {
  const dismiss = useEffectEvent(() => onDismiss());

  useEffect(() => {
    if (!isOpen) return;

    // Capture phase, so Escape closes only this box and not a dialog behind it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      dismiss();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [ref, isOpen]);
}
