import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SyncManager } from '../utils/sync';

interface OfflineIndicatorProps {
  onSyncComplete?: () => void;
}

export default function OfflineIndicator({ onSyncComplete }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load check
    setPendingCount(SyncManager.getQueue().length);

    // Set up a periodic poller to check queue count and attempt sync if online
    const interval = setInterval(() => {
      const count = SyncManager.getQueue().length;
      setPendingCount(count);
      if (navigator.onLine && count > 0 && !isSyncing) {
        triggerSync();
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isSyncing]);

  const triggerSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    const count = SyncManager.getQueue().length;
    if (count === 0) return;

    setIsSyncing(true);
    const result = await SyncManager.syncPending();
    setIsSyncing(false);
    setPendingCount(SyncManager.getQueue().length);
    
    if (result.success && result.synced > 0) {
      if (onSyncComplete) {
        onSyncComplete();
      }
    }
  };

  if (isOnline && pendingCount === 0) return null; // Hide when all is perfectly online and synced

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-md text-sm flex items-center space-x-4 transition-all duration-300 ${
        !isOnline 
          ? 'bg-amber-100/90 border-amber-300 text-amber-900 shadow-amber-500/20' 
          : 'bg-indigo-100/90 border-indigo-300 text-indigo-900 shadow-indigo-500/20'
      }`}>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-indigo-600 animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
          )}
          <span className="font-bold text-xs tracking-wide uppercase">
            {!isOnline ? 'Connection Lost' : 'Syncing Offline Data'}
          </span>
        </div>

        <div className="flex items-center space-x-2 border-l pl-3 border-black/10">
          {pendingCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-white/50 text-indigo-900">
                {pendingCount} Left
              </span>
              {isOnline && (
                <button
                  id="btn-sync-now"
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white rounded-full hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
