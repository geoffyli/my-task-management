import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  locationKey: string;
  children: ReactNode;
}

export function PageTransition({ locationKey, children }: Props) {
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const prevKey = useRef(locationKey);

  useEffect(() => {
    if (reducedMotion) return;
    if (locationKey !== prevKey.current) {
      prevKey.current = locationKey;
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 20);
      return () => clearTimeout(timer);
    }
  }, [locationKey, reducedMotion]);

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <div
      className="transition-opacity duration-150 ease-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
