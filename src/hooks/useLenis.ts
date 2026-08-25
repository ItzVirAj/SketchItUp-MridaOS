import { useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';

export const useLenis = (dependency?: any) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  const initLenis = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const wrapper = containerRef.current;
    const content = contentRef.current;

    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper: wrapper,
      content: content,
      eventsTarget: wrapper,
      duration: 1.0,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.5,
      autoResize: true,
    });

    lenisRef.current = lenis;

    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    // Initial and deferred resize calculation
    lenis.resize();
    const timer1 = setTimeout(() => lenis.resize(), 150);
    const timer2 = setTimeout(() => lenis.resize(), 500);

    cleanupRef.current = () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const setContainerRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
    if (node && contentRef.current) {
      initLenis();
    }
  }, [initLenis]);

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (node && containerRef.current) {
      initLenis();
    }
  }, [initLenis]);

  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      initLenis();
    }
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [initLenis, dependency]);

  return {
    containerRef: setContainerRef,
    contentRef: setContentRef,
    lenis: lenisRef.current,
  };
};
