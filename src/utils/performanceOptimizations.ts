// src/utils/performanceOptimizations.ts
import React from 'react';

/**
 * 성능 최적화를 위한 유틸리티 함수들
 */

// React.memo wrapper with display name
export const memo = <T extends React.ComponentType<any>>(
  Component: T,
  displayName?: string
): React.MemoExoticComponent<T> => {
  const MemoizedComponent = React.memo(Component);
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }
  return MemoizedComponent;
};

// useMemo hook wrapper for expensive calculations
export const useMemoOnce = <T>(factory: () => T, deps: React.DependencyList): T => {
  return React.useMemo(factory, deps);
};

// useCallback wrapper for event handlers
export const useCallbackOnce = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return React.useCallback(callback, deps);
};

// Debounce function for search/input
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

// Memoized comparison for objects
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  
  return true;
};
