import { useLayoutEffect } from 'react';

let lockCount = 0;
let scrollY = 0;
let previousStyles: Record<string, string> | undefined;

export function useDocumentScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      const { body, documentElement } = document;
      scrollY = window.scrollY;
      previousStyles = {
        bodyOverflow: body.style.overflow,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyWidth: body.style.width,
        htmlOverflow: documentElement.style.overflow,
      };
      documentElement.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount !== 0 || !previousStyles) return;

      const { body, documentElement } = document;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.position = previousStyles.bodyPosition;
      body.style.top = previousStyles.bodyTop;
      body.style.width = previousStyles.bodyWidth;
      documentElement.style.overflow = previousStyles.htmlOverflow;
      previousStyles = undefined;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
