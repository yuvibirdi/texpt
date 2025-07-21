import React, { useState, useEffect } from 'react';
import { canvasVirtualizationService } from '../services/canvasVirtualizationService';
import { lazyLoadingService } from '../services/lazyLoadingService';
import { compilationCacheService } from '../services/compilationCacheService';
import { memoryManagementService } from '../services/memoryManagementService';
import './PerformanceMonitor.css';

interface PerformanceMonitorProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ isVisible, onClose }) => {
  const [stats, setStats] = useState({
    virtualization: { totalObjects: 0, visibleObjects: 0, renderedObjects: 0, memoryUsage: 0 },
    lazyLoading: { thumbnails: { count: 0, size: 0 }, previews: { count: 0, size: 0 }, totalMemory: 0 },
    compilationCache: { totalEntries: 0, memoryUsage: 0, hitRate: 0, oldestEntry: 0, newestEntry: 0, averageSize: 0 },
    memoryManagement: { fabricObjects: 0, canvasMemory: 0, imageCache: 0, compilationCache: 0, totalEstimated: 0, gcSuggested: false }
  });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Start monitoring
      updateStats();
      const interval = setInterval(updateStats, 2000); // Update every 2 seconds
      setRefreshInterval(interval);
    } else {
      // Stop monitoring
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isVisible]);

  const updateStats = () => {
    setStats({
      virtualization: canvasVirtualizationService.getStats(),
      lazyLoading: lazyLoadingService.getCacheStats(),
      compilationCache: compilationCacheService.getStats(),
      memoryManagement: memoryManagementService.getMemoryStats()
    });
  };

  const handleCleanup = async () => {
    await memoryManagementService.performCleanup(true);
    updateStats();
  };

  const handleClearCaches = () => {
    lazyLoadingService.clearAllCaches();
    compilationCacheService.clearCache();
    updateStats();
  };

  const handleForceGC = () => {
    memoryManagementService.forceGarbageCollection();
    setTimeout(updateStats, 1000); // Update after a delay to see the effect
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };

  if (!isVisible) return null;

  return (
    <div className="performance-monitor-overlay">
      <div className="performance-monitor">
        <div className="performance-monitor-header">
          <h3>Performance Monitor</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="performance-monitor-content">
          {/* Canvas Virtualization Stats */}
          <div className="stats-section">
            <h4>Canvas Virtualization</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Objects:</span>
                <span className="stat-value">{stats.virtualization.totalObjects}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Visible Objects:</span>
                <span className="stat-value">{stats.virtualization.visibleObjects}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Rendered Objects:</span>
                <span className="stat-value">{stats.virtualization.renderedObjects}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Memory Usage:</span>
                <span className="stat-value">{formatBytes(stats.virtualization.memoryUsage)}</span>
              </div>
            </div>
          </div>

          {/* Lazy Loading Stats */}
          <div className="stats-section">
            <h4>Lazy Loading</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Cached Thumbnails:</span>
                <span className="stat-value">{stats.lazyLoading.thumbnails.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Thumbnail Cache Size:</span>
                <span className="stat-value">{formatBytes(stats.lazyLoading.thumbnails.size)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cached Previews:</span>
                <span className="stat-value">{stats.lazyLoading.previews.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Cache Memory:</span>
                <span className="stat-value">{formatBytes(stats.lazyLoading.totalMemory)}</span>
              </div>
            </div>
          </div>

          {/* Compilation Cache Stats */}
          <div className="stats-section">
            <h4>Compilation Cache</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Cache Entries:</span>
                <span className="stat-value">{stats.compilationCache.totalEntries}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Hit Rate:</span>
                <span className="stat-value">{formatPercentage(stats.compilationCache.hitRate)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Memory Usage:</span>
                <span className="stat-value">{formatBytes(stats.compilationCache.memoryUsage)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Average Entry Size:</span>
                <span className="stat-value">{formatBytes(stats.compilationCache.averageSize)}</span>
              </div>
            </div>
          </div>

          {/* Memory Management Stats */}
          <div className="stats-section">
            <h4>Memory Management</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Fabric Objects:</span>
                <span className="stat-value">{stats.memoryManagement.fabricObjects}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Canvas Memory:</span>
                <span className="stat-value">{formatBytes(stats.memoryManagement.canvasMemory)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Image Cache:</span>
                <span className="stat-value">{formatBytes(stats.memoryManagement.imageCache)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Estimated:</span>
                <span className={`stat-value ${stats.memoryManagement.gcSuggested ? 'warning' : ''}`}>
                  {formatBytes(stats.memoryManagement.totalEstimated)}
                  {stats.memoryManagement.gcSuggested && ' ⚠️'}
                </span>
              </div>
            </div>
            
            {stats.memoryManagement.gcSuggested && (
              <div className="warning-message">
                High memory usage detected. Consider running cleanup or garbage collection.
              </div>
            )}
          </div>

          {/* Memory Trend */}
          <div className="stats-section">
            <h4>Memory Trend</h4>
            <div className="memory-trend">
              <span className={`trend-indicator ${memoryManagementService.getMemoryTrend()}`}>
                {memoryManagementService.getMemoryTrend().toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="performance-monitor-actions">
          <button className="action-btn primary" onClick={handleCleanup}>
            Run Cleanup
          </button>
          <button className="action-btn secondary" onClick={handleClearCaches}>
            Clear Caches
          </button>
          <button className="action-btn secondary" onClick={handleForceGC}>
            Force GC
          </button>
          <button className="action-btn secondary" onClick={updateStats}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;