import { TestResult } from '../types';

export interface SyncQueueItem {
  id: string; // Unique queue item ID
  Student_ID: string;
  Test_Date: string;
  Test_Type: string;
  Teacher_ID: string;
  component: 'Know' | 'Read' | 'Spell' | 'Camera_Word_Read' | 'Camera_Word_Spell' | 'Notes';
  value: number | string | null;
  timestamp: number;
}

const QUEUE_KEY = 'tfc_sync_queue';
const RESULTS_CACHE_KEY = 'tfc_results_cache';

export class SyncManager {
  // --- Queue Management ---
  public static getQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveQueue(queue: SyncQueueItem[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  public static addToQueue(
    Student_ID: string,
    Test_Date: string,
    Test_Type: string,
    Teacher_ID: string,
    component: 'Know' | 'Read' | 'Spell' | 'Camera_Word_Read' | 'Camera_Word_Spell' | 'Notes',
    value: number | string | null
  ): SyncQueueItem {
    const queue = this.getQueue();
    
    const existingIndex = queue.findIndex(
      item =>
        item.Student_ID === Student_ID &&
        item.Test_Type === Test_Type &&
        item.component === component
    );

    const newItem: SyncQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      Student_ID,
      Test_Date,
      Test_Type,
      Teacher_ID,
      component,
      value,
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      queue[existingIndex] = newItem;
    } else {
      queue.push(newItem);
    }

    this.saveQueue(queue);
    return newItem;
  }

  public static removeFromQueue(id: string) {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    this.saveQueue(filtered);
  }

  // --- Local Results Cache (for instant load and offline resume) ---
  public static getCache(): Record<string, TestResult> {
    try {
      const data = localStorage.getItem(RESULTS_CACHE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public static saveCache(cache: Record<string, TestResult>) {
    localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(cache));
  }

  public static updateCachedResult(
    Student_ID: string,
    Test_Date: string,
    Test_Type: string,
    Teacher_ID: string,
    component: 'Know' | 'Read' | 'Spell' | 'Camera_Word_Read' | 'Camera_Word_Spell' | 'Notes',
    value: number | string | null
  ): TestResult {
    const cache = this.getCache();
    const cacheKey = `${Student_ID}_${Test_Type}`;
    
    const existing = cache[cacheKey] || {
      Student_ID,
      Test_Date,
      Test_Type: Test_Type as any,
      Know: null,
      Read: null,
      Spell: null,
      Camera_Word_Read: null,
      Camera_Word_Spell: null,
      Total_Marks: 0,
      Teacher_ID,
      Last_Updated: new Date().toISOString(),
      Notes: ''
    };

    // Update the specific component
    if (component === 'Notes') {
      existing.Notes = (value as string) || '';
    } else {
      existing[component] = value === null ? null : Number(value);
    }

    // Recompute total marks
    const know = Number(existing.Know ?? 0);
    const read = Number(existing.Read ?? 0);
    const spell = Number(existing.Spell ?? 0);
    const cwRead = Number(existing.Camera_Word_Read ?? 0);
    const cwSpell = Number(existing.Camera_Word_Spell ?? 0);
    existing.Total_Marks = know + read + spell + cwRead + cwSpell;
    existing.Last_Updated = new Date().toISOString();

    cache[cacheKey] = existing;
    this.saveCache(cache);
    return existing;
  }

  public static mergeServerResults(results: TestResult[]) {
    const cache = this.getCache();
    results.forEach(r => {
      const cacheKey = `${r.Student_ID}_${r.Test_Type}`;
      // Only overwrite if cache doesn't exist, or if server version is newer and we have no pending sync
      const pendingQueue = this.getQueue();
      const hasPendingSync = pendingQueue.some(
        item => item.Student_ID === r.Student_ID && item.Test_Type === r.Test_Type
      );

      if (!hasPendingSync) {
        cache[cacheKey] = r;
      }
    });
    this.saveCache(cache);
  }

  // --- Perform Offline Synchronization ---
  public static async syncPending(
    onProgress?: (syncedCount: number, total: number) => void
  ): Promise<{ success: boolean; synced: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: true, synced: 0 };

    let syncedCount = 0;
    const total = queue.length;

    for (const item of queue) {
      try {
        // Construct partial payload to send to server
        const response = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Student_ID: item.Student_ID,
            Test_Date: item.Test_Date,
            Test_Type: item.Test_Type,
            Teacher_ID: item.Teacher_ID,
            [item.component]: item.value
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Update cache with server response
          if (data.success && data.result) {
            const cache = this.getCache();
            const cacheKey = `${item.Student_ID}_${item.Test_Type}`;
            cache[cacheKey] = data.result;
            this.saveCache(cache);
          }
          
          this.removeFromQueue(item.id);
          syncedCount++;
          if (onProgress) onProgress(syncedCount, total);
        } else {
          // Server error, stop and try again later
          return { success: false, synced: syncedCount };
        }
      } catch (err) {
        // Network error, we are still offline, stop
        console.warn('Sync failed - likely offline:', err);
        return { success: false, synced: syncedCount };
      }
    }

    return { success: true, synced: syncedCount };
  }
}
