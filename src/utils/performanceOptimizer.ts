// 성능 최적화 유틸리티
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// 1. 메모이제이션된 데이터 캐시
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const useDataCache = <T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  ttl: number = 5 * 60 * 1000 // 5분 기본 TTL
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = key;
    const cached = dataCache.get(cacheKey);
    
    // 캐시된 데이터가 유효하고 강제 새로고침이 아닌 경우
    if (!forceRefresh && cached && Date.now() - cached.timestamp < cached.ttl) {
      setData(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      
      // 캐시에 저장
      dataCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl
      });
      
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: () => fetchData(true) };
};

// 2. 배치 API 호출 관리자
class BatchAPIManager {
  private batches = new Map<string, {
    requests: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void; params: any }>;
    timer: any;
  }>();

  batch<T>(
    batchKey: string,
    params: any,
    executor: (batchedParams: any[]) => Promise<T[]>,
    delay: number = 100
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(async () => {
            const currentBatch = this.batches.get(batchKey);
            if (!currentBatch) return;
            
            this.batches.delete(batchKey);
            
            try {
              const allParams = currentBatch.requests.map(req => req.params);
              const results = await executor(allParams);
              
              currentBatch.requests.forEach((req, index) => {
                req.resolve(results[index]);
              });
            } catch (error) {
              currentBatch.requests.forEach(req => {
                req.reject(error);
              });
            }
          }, delay)
        };
        
        this.batches.set(batchKey, batch);
      }
      
      batch.requests.push({ resolve, reject, params });
    });
  }
}

export const batchAPIManager = new BatchAPIManager();

// 3. 디바운스된 상태 업데이트
export const useDebouncedState = <T>(initialValue: T, delay: number = 300) => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<any>();

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedValue, updateValue] as const;
};

// 4. 메모이제이션된 계산 결과
export const useMemoizedComputation = <T, D extends readonly unknown[]>(
  computeFn: () => T,
  deps: D,
  equalityFn?: (prev: T, next: T) => boolean
) => {
  const memoizedResult = useMemo(computeFn, deps);
  
  const prevResultRef = useRef<T>();
  const stableResult = useMemo(() => {
    if (equalityFn && prevResultRef.current) {
      if (equalityFn(prevResultRef.current, memoizedResult)) {
        return prevResultRef.current;
      }
    }
    prevResultRef.current = memoizedResult;
    return memoizedResult;
  }, [memoizedResult, equalityFn]);

  return stableResult;
};

// 5. 네트워크 상태 최적화 (React Native 전용)
export const useNetworkOptimization = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'fast' | 'slow' | 'offline'>('fast');

  return { isOnline, connectionQuality };
};

// 6. 메모리 사용량 최적화
export const clearDataCache = (pattern?: string) => {
  if (pattern) {
    for (const key of dataCache.keys()) {
      if (key.includes(pattern)) {
        dataCache.delete(key);
      }
    }
  } else {
    dataCache.clear();
  }
};

// 7. FlatList 최적화 설정
export const FLATLIST_OPTIMIZATION_PROPS = {
  removeClippedSubviews: Platform.OS === 'android',
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 100,
  initialNumToRender: 8,
  windowSize: 5,
};