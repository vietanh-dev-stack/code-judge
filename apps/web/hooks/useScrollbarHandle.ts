import { useRef, type RefObject } from 'react';

/**
 * Ref helper for scroll containers using `.custom-scrollbar` in globals.css.
 * Scrollbar styling is CSS-only (fixed gutter, dark thumb) — no hover class toggling.
 */
export function useScrollbarHover<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  return useRef<T | null>(null);
}
