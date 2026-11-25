import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { create } from 'zustand';
import { offlineDb, SyncActionType } from './offlineDb';
import { api } from './api';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setStats: (stats: { pendingCount: number; failedCount: number; syncedCount: number }) => void;
  setLastSyncedAt: (ts: string) => void;
  setLastError: (err: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  syncedCount: 0,
  lastSyncedAt: null,
  lastError: null,
  setOnline: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setStats: (stats) => set(stats),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
}));

class SyncManagerService {
  private subscription: NetInfoSubscription | null = null;

  async refreshStats(): Promise<void> {
    try {
      const stats = await offlineDb.getSyncStats();
      useSyncStore.getState().setStats(stats);
    } catch {
      // Ignore SQLite init error on unsupported web runtime
    }
  }

  startListening(): void {
    if (this.subscription) return;

    this.refreshStats();

    this.subscription = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      useSyncStore.getState().setOnline(online);
      if (online) {
        this.flushQueue();
      }
    });
  }

  stopListening(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
  }

  async enqueueOperation(action: SyncActionType, payload: Record<string, any>): Promise<string> {
    const localId = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await offlineDb.enqueueOperation(localId, action, payload);
    await this.refreshStats();

    if (useSyncStore.getState().isOnline) {
      await this.flushQueue();
    }
    return localId;
  }

  async flushQueue(): Promise<void> {
    const store = useSyncStore.getState();
    if (store.isSyncing || !store.isOnline) return;

    try {
      const pending = await offlineDb.getPendingQueue();
      if (pending.length === 0) return;

      store.setSyncing(true);
      store.setLastError(null);

      const operations = pending.map((item) => ({
        localId: item.id,
        idempotencyKey: item.idempotency_key,
        action: item.action,
        payload: JSON.parse(item.payload_json),
        createdAt: item.created_at,
      }));

      const response = await api.syncBatch(operations);
      for (const res of response.results || []) {
        if (res.status === 'SYNCED') {
          await offlineDb.markSynced(res.localId, res.serverId, res.serverNumber);
        } else {
          await offlineDb.markFailed(res.localId, res.error || 'Sync failed');
        }
      }

      store.setLastSyncedAt(new Date().toISOString());
      await this.refreshStats();
    } catch (err: any) {
      store.setLastError(err.message || 'Background sync failed');
    } finally {
      store.setSyncing(false);
    }
  }

  async pullCache(): Promise<void> {
    const store = useSyncStore.getState();
    if (!store.isOnline) return;

    try {
      store.setSyncing(true);
      const lastPulledAt = await offlineDb.getLastPulledAt();
      const delta = await api.pullSyncDelta(lastPulledAt || undefined);
      await offlineDb.cacheDelta(delta);
      store.setLastSyncedAt(delta.serverTimestamp || new Date().toISOString());
      store.setLastError(null);
    } catch (err: any) {
      store.setLastError(err.message || 'Cache refresh failed');
    } finally {
      store.setSyncing(false);
    }
  }

  async retryFailed(): Promise<void> {
    await offlineDb.retryFailedItems();
    await this.refreshStats();
    await this.flushQueue();
  }
}

export const SyncManager = new SyncManagerService();
