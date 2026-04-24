import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT_WIDTH = 640;
const SERVER_WIDTH = 1024;

type Listener = () => void;

const listeners = new Set<Listener>();
let windowWidth = typeof window === 'undefined' ? SERVER_WIDTH : window.innerWidth;
let animationFrameId: number | null = null;

const readWindowWidth = () => (typeof window === 'undefined' ? SERVER_WIDTH : window.innerWidth);

const emitIfChanged = () => {
  const nextWindowWidth = readWindowWidth();
  if (nextWindowWidth === windowWidth) return;

  windowWidth = nextWindowWidth;
  listeners.forEach((listener) => listener());
};

const handleResize = () => {
  if (typeof window === 'undefined' || animationFrameId !== null) return;

  animationFrameId = window.requestAnimationFrame(() => {
    animationFrameId = null;
    emitIfChanged();
  });
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);

  if (typeof window !== 'undefined' && listeners.size === 1) {
    windowWidth = readWindowWidth();
    window.addEventListener('resize', handleResize, { passive: true });
  }

  return () => {
    listeners.delete(listener);

    if (typeof window !== 'undefined' && listeners.size === 0) {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  };
};

const getWindowWidthSnapshot = () => windowWidth;
const getServerWindowWidthSnapshot = () => SERVER_WIDTH;
const getIsMobileSnapshot = () => windowWidth < MOBILE_BREAKPOINT_WIDTH;
const getServerIsMobileSnapshot = () => SERVER_WIDTH < MOBILE_BREAKPOINT_WIDTH;

const useWindowWidth = () => useSyncExternalStore(subscribe, getWindowWidthSnapshot, getServerWindowWidthSnapshot);

export const useIsMobileBreakpoint = () => useSyncExternalStore(subscribe, getIsMobileSnapshot, getServerIsMobileSnapshot);

export default useWindowWidth;
