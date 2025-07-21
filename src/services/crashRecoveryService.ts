import { Presentation } from '../types/presentation';

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  presentationId: string;
  presentationTitle: string;
  slideCount: number;
  autoSave: boolean;
  version: string;
}

export interface RecoveryData {
  presentation: Presentation;
  metadata: BackupMetadata;
}

class CrashRecoveryService {
  private readonly BACKUP_KEY_PREFIX = 'latex-editor-backup-';
  private readonly METADATA_KEY = 'latex-editor-backup-metadata';
  private readonly MAX_BACKUPS = 5;
  private readonly BACKUP_INTERVAL = 300000; // 5 minutes
  private backupTimer: NodeJS.Timeout | null = null;
  private isBackupEnabled = true;
  private lastBackupHash: string | null = null;

  constructor() {
    this.setupUnloadHandler();
    this.cleanupOldBackups();
  }

  /**
   * Start automatic backup process
   */
  startAutoBackup(presentation: Presentation): void {
    if (!this.isBackupEnabled) return;

    this.stopAutoBackup();
    
    this.backupTimer = setInterval(() => {
      this.createBackup(presentation, true);
    }, this.BACKUP_INTERVAL);

    // Create initial backup
    this.createBackup(presentation, true);
  }

  /**
   * Stop automatic backup process
   */
  stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  /**
   * Create a backup of the current presentation
   */
  createBackup(presentation: Presentation, autoSave: boolean = false): string {
    try {
      // Create a hash of the presentation to check if it has changed
      const presentationHash = this.hashPresentation(presentation);
      
      // Skip backup if presentation hasn't changed (for auto-saves only)
      if (autoSave && this.lastBackupHash === presentationHash) {
        return '';
      }

      const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date();

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        presentationId: presentation.id,
        presentationTitle: presentation.title,
        slideCount: presentation.slides.length,
        autoSave,
        version: presentation.version,
      };

      const recoveryData: RecoveryData = {
        presentation: JSON.parse(JSON.stringify(presentation)), // Deep clone
        metadata,
      };

      // Store the backup
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      localStorage.setItem(backupKey, JSON.stringify(recoveryData));

      // Update metadata list
      this.updateBackupMetadata(metadata);

      // Update last backup hash
      this.lastBackupHash = presentationHash;

      console.log(`Backup created: ${backupId} (${autoSave ? 'auto' : 'manual'})`);
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create presentation backup');
    }
  }

  /**
   * Get all available backups
   */
  getAvailableBackups(): BackupMetadata[] {
    try {
      const metadataJson = localStorage.getItem(this.METADATA_KEY);
      if (!metadataJson) return [];

      const metadata: BackupMetadata[] = JSON.parse(metadataJson);
      
      // Filter out backups that no longer exist in storage
      return metadata.filter(backup => {
        const backupKey = this.BACKUP_KEY_PREFIX + backup.id;
        return localStorage.getItem(backupKey) !== null;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get backup metadata:', error);
      return [];
    }
  }

  /**
   * Recover a presentation from backup
   */
  recoverFromBackup(backupId: string): RecoveryData | null {
    try {
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      const backupJson = localStorage.getItem(backupKey);
      
      if (!backupJson) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      const recoveryData: RecoveryData = JSON.parse(backupJson);
      
      // Validate the recovery data
      if (!recoveryData.presentation || !recoveryData.metadata) {
        throw new Error('Invalid backup data structure');
      }

      console.log(`Recovered presentation from backup: ${backupId}`);
      return recoveryData;
    } catch (error) {
      console.error('Failed to recover from backup:', error);
      return null;
    }
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(backupId: string): boolean {
    try {
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      localStorage.removeItem(backupKey);

      // Update metadata
      const metadata = this.getAvailableBackups().filter(backup => backup.id !== backupId);
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));

      console.log(`Deleted backup: ${backupId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }



  /**
   * Check if there are any crash recovery backups available
   */
  hasCrashRecoveryData(): boolean {
    const backups = this.getAvailableBackups();
    return backups.length > 0;
  }

  /**
   * Get the most recent backup for crash recovery
   */
  getMostRecentBackup(): RecoveryData | null {
    const backups = this.getAvailableBackups();
    if (backups.length === 0) return null;

    const mostRecent = backups[0]; // Already sorted by timestamp desc
    return this.recoverFromBackup(mostRecent.id);
  }

  /**
   * Enable or disable backup functionality
   */
  setBackupEnabled(enabled: boolean): void {
    this.isBackupEnabled = enabled;
    if (!enabled) {
      this.stopAutoBackup();
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): {
    totalBackups: number;
    autoBackups: number;
    manualBackups: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    totalSize: number;
  } {
    const backups = this.getAvailableBackups();
    
    const autoBackups = backups.filter(b => b.autoSave).length;
    const manualBackups = backups.length - autoBackups;
    
    let totalSize = 0;
    backups.forEach(backup => {
      const backupKey = this.BACKUP_KEY_PREFIX + backup.id;
      const backupData = localStorage.getItem(backupKey);
      if (backupData) {
        totalSize += backupData.length;
      }
    });

    return {
      totalBackups: backups.length,
      autoBackups,
      manualBackups,
      oldestBackup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp) : null,
      newestBackup: backups.length > 0 ? new Date(backups[0].timestamp) : null,
      totalSize,
    };
  }

  private updateBackupMetadata(newMetadata: BackupMetadata): void {
    try {
      const existingMetadata = this.getAvailableBackups();
      existingMetadata.push(newMetadata);

      // Sort by timestamp (newest first)
      existingMetadata.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Keep only the most recent backups
      const trimmedMetadata = existingMetadata.slice(0, this.MAX_BACKUPS);

      // Remove old backup files that are no longer in metadata
      const removedBackups = existingMetadata.slice(this.MAX_BACKUPS);
      removedBackups.forEach(backup => {
        const backupKey = this.BACKUP_KEY_PREFIX + backup.id;
        localStorage.removeItem(backupKey);
      });

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(trimmedMetadata));
    } catch (error) {
      console.error('Failed to update backup metadata:', error);
    }
  }

  private setupUnloadHandler(): void {
    // Create a final backup when the page is about to unload
    window.addEventListener('beforeunload', () => {
      // This is a best-effort attempt - browsers limit what can be done here
      try {
        const event = new CustomEvent('create-final-backup');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to create final backup on unload:', error);
      }
    });

    // Handle visibility change (tab switching, minimizing)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        try {
          const event = new CustomEvent('create-visibility-backup');
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Failed to create visibility backup:', error);
        }
      }
    });
  }

  private hashPresentation(presentation: Presentation): string {
    try {
      // Create a simplified hash of the presentation content
      const hashData = {
        id: presentation.id,
        title: presentation.title,
        slideCount: presentation.slides.length,
        slides: presentation.slides.map(slide => ({
          id: slide.id,
          title: slide.title,
          elementCount: slide.elements.length,
          elements: slide.elements.map(el => ({
            id: el.id,
            type: el.type,
            content: el.content,
            position: el.position,
            size: el.size
          }))
        })),
        updatedAt: presentation.updatedAt
      };
      
      // Simple hash function
      const str = JSON.stringify(hashData);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString();
    } catch (error) {
      console.error('Failed to hash presentation:', error);
      return Date.now().toString(); // Fallback to timestamp
    }
  }

  private cleanupOldBackups(): void {
    try {
      // Clean up any orphaned backup data
      const metadata = this.getAvailableBackups();
      const validBackupIds = new Set(metadata.map(m => m.id));

      // Check all localStorage keys for orphaned backups
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.BACKUP_KEY_PREFIX)) {
          const backupId = key.replace(this.BACKUP_KEY_PREFIX, '');
          if (!validBackupIds.has(backupId)) {
            localStorage.removeItem(key);
            console.log(`Cleaned up orphaned backup: ${backupId}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }
  /**
   * Clear all backup data
   */
  clearAllBackups(): void {
    try {
      const metadata = this.getAvailableBackups();
      
      // Remove all backup data
      metadata.forEach(backup => {
        const backupKey = this.BACKUP_KEY_PREFIX + backup.id;
        localStorage.removeItem(backupKey);
      });
      
      // Clear metadata
      localStorage.removeItem(this.METADATA_KEY);
      
      console.log('All backups cleared');
    } catch (error) {
      console.error('Failed to clear backups:', error);
    }
  }
}

// Export singleton instance
export const crashRecoveryService = new CrashRecoveryService();