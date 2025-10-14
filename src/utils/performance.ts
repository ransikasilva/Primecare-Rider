import { InteractionManager, Dimensions } from 'react-native';

// Device performance detection
export const getDevicePerformanceClass = () => {
  const { width, height } = Dimensions.get('window');
  const pixelCount = width * height;
  
  // Basic performance classification based on screen resolution and other factors
  if (pixelCount > 2000000) { // High-end devices (1440p+)
    return 'high';
  } else if (pixelCount > 1000000) { // Mid-range devices (1080p)
    return 'medium';
  } else { // Low-end devices
    return 'low';
  }
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Run after interactions complete (performance optimization)
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(callback);
};

// Batch updates for better performance
export const batchUpdates = <T>(
  items: T[],
  processor: (item: T) => void,
  batchSize: number = 10,
  delay: number = 0
): Promise<void> => {
  return new Promise((resolve) => {
    let index = 0;
    
    const processBatch = () => {
      const endIndex = Math.min(index + batchSize, items.length);
      
      for (let i = index; i < endIndex; i++) {
        processor(items[i]);
      }
      
      index = endIndex;
      
      if (index >= items.length) {
        resolve();
      } else {
        setTimeout(processBatch, delay);
      }
    };
    
    processBatch();
  });
};

// Memory usage optimization for images
export const getOptimalImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1920,
  maxHeight: number = 1080
) => {
  const aspectRatio = originalWidth / originalHeight;
  
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  
  if (targetWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = targetWidth / aspectRatio;
  }
  
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = targetHeight * aspectRatio;
  }
  
  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight),
  };
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startTimer(label: string): void {
    if (__DEV__) {
      console.time(label);
    }
  }
  
  endTimer(label: string): number {
    if (__DEV__) {
      console.timeEnd(label);
    }
    
    const now = Date.now();
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(now);
    return now;
  }
  
  measureRenderTime<T>(
    label: string,
    renderFunction: () => T
  ): T {
    this.startTimer(`Render: ${label}`);
    const result = renderFunction();
    this.endTimer(`Render: ${label}`);
    return result;
  }
  
  measureAsyncOperation<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.startTimer(`Async: ${label}`);
    return operation().finally(() => {
      this.endTimer(`Async: ${label}`);
    });
  }
  
  getMetrics(label: string): {
    count: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return null;
    
    const count = times.length;
    const average = times.reduce((sum, time) => sum + time, 0) / count;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { count, average, min, max };
  }
  
  clearMetrics(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
  
  logAllMetrics(): void {
    if (__DEV__) {
      console.log('📊 Performance Metrics:');
      this.metrics.forEach((times, label) => {
        const metrics = this.getMetrics(label);
        if (metrics) {
          console.log(`  ${label}:`, metrics);
        }
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React component performance helpers
export const shouldComponentUpdate = (
  prevProps: Record<string, any>,
  nextProps: Record<string, any>,
  shallow: boolean = true
): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return true;
  }
  
  for (const key of prevKeys) {
    if (shallow) {
      if (prevProps[key] !== nextProps[key]) {
        return true;
      }
    } else {
      if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
        return true;
      }
    }
  }
  
  return false;
};

// Bundle size optimization helpers
export const lazy = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
  return React.lazy(() => {
    return runAfterInteractions(() => factory());
  });
};

// Memory leak prevention
export const createCleanupManager = () => {
  const cleanupFunctions: (() => void)[] = [];
  
  return {
    add: (cleanup: () => void) => {
      cleanupFunctions.push(cleanup);
    },
    cleanup: () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      });
      cleanupFunctions.length = 0;
    },
  };
};

// Image optimization settings based on device performance
export const getImageQualitySettings = () => {
  const performanceClass = getDevicePerformanceClass();
  
  switch (performanceClass) {
    case 'high':
      return {
        quality: 0.9,
        maxWidth: 1920,
        maxHeight: 1080,
        compress: 0.8,
      };
    case 'medium':
      return {
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 720,
        compress: 0.7,
      };
    case 'low':
      return {
        quality: 0.7,
        maxWidth: 854,
        maxHeight: 480,
        compress: 0.6,
      };
    default:
      return {
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 720,
        compress: 0.7,
      };
  }
};