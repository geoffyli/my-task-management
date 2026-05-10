import { useCallback, useRef, useState } from "react";

interface UseInViewOptions {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}

export function useInView(options: UseInViewOptions = {}) {
  const { rootMargin = "200px", threshold = 0, once = true } = options;
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsInView(true);
            if (once && observerRef.current) {
              observerRef.current.disconnect();
              observerRef.current = null;
            }
          } else if (!once) {
            setIsInView(false);
          }
        },
        { rootMargin, threshold }
      );

      observerRef.current.observe(node);
    },
    [rootMargin, threshold, once]
  );

  return { ref, isInView };
}
