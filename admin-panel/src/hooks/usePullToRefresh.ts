import { useState, useRef, useCallback } from 'react';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export const usePullToRefresh = (config: PullToRefreshConfig) => {
  const { onRefresh, threshold = 120, maxPullDistance = 200, disabled = false } = config;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    const touch = e.touches[0];
    setStartY(touch.clientY);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY === 0) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = currentY - startY;

    // Only handle downward pull from top of scroll area
    if (distance > 0 && (containerRef.current?.scrollTop || 0) <= 5) {
      e.preventDefault();
      const pullDistance = Math.min(distance * 0.6, maxPullDistance);
      setPullDistance(pullDistance);
      setCanRefresh(pullDistance >= threshold);
    }
  }, [disabled, isRefreshing, startY, threshold, maxPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (canRefresh && pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setStartY(0);
    setCanRefresh(false);
  }, [disabled, isRefreshing, canRefresh, pullDistance, threshold, onRefresh]);

  const attachToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const touchStartHandler = handleTouchStart;
    const touchMoveHandler = handleTouchMove;
    const touchEndHandler = handleTouchEnd;

    element.addEventListener('touchstart', touchStartHandler, { passive: false });
    element.addEventListener('touchmove', touchMoveHandler, { passive: false });
    element.addEventListener('touchend', touchEndHandler, { passive: true });

    return () => {
      element.removeEventListener('touchstart', touchStartHandler);
      element.removeEventListener('touchmove', touchMoveHandler);
      element.removeEventListener('touchend', touchEndHandler);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    attachToElement,
    isRefreshing,
    pullDistance,
    canRefresh,
  };
};
