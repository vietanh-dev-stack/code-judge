import { useRef, useEffect, type RefObject } from 'react';

/** Adds `is-hovered` on the scroll container so `.custom-scrollbar` thumb appears on hover. */
export function useScrollbarHover<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add('is-hovered');
    const hide = () => el.classList.remove('is-hovered');

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    return () => {
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
    };
  }, []);

  return ref;
}
