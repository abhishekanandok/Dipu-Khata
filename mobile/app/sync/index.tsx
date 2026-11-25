import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import { offlineDb, SyncQueueItem } from '../../services/offlineDb';
import { SyncManager, useSyncStore } from '../../services/syncManager';

export default function SyncStatusScreen() {
  const router = useRouter();
  const { isOnline, isSyncing, pendingCount, failedCount, syncedCount, lastSyncedAt, lastError } =
    useSyncStore();

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = async () => {
    try {
      const items = await offlineDb.getAllQueueItems(50);
      setQueueItems(items);
      await SyncManager.refreshStats();
    } catch {
      // Ignore on unsupported runtime
    }
  };

  useEffect(() => {
    loadQueue();
  }, [pendingCount, failedCount, syncedCount, isSyncing]);

  const handleSyncNow = async () => {
    setRefreshing(true);
    await SyncManager.flushQueue();
    await loadQueue();
    setRefreshing(false);
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    await SyncManager.pullCache();
    await loadQueue();
    setRefreshing(false);
  };

  const handleRetryFailed = async () => {
    setRefreshing(true);
    await SyncManager.retryFailed();
    await loadQueue();
    setRefreshing(false);
  };

  const renderQueueItem = ({ item }: { item: SyncQueueItem }) => {
    const statusLabel =
      item.status === 'SYNCED'
        ? 'Synced'
        : item.status === 'PENDING'
        ? 'Pending Sync'
        : 'Sync Failed';

    return (
      <GlassCard style={styles.queueCard}>
        <View style={styles.queueHeader}>
          <Text style={styles.actionText}>{item.action}</Text>
          <StatusBadge
            status={
              item.status === 'SYNCED'
                ? 'COMPLETED'
                : item.status === 'PENDING'
                ? 'PENDING'
                : 'FAILED'
            }
            label={statusLabel}
          />
        </View>

        <Text style={styles.metaText}>
          ID: {item.id} {item.server_number ? `• #${item.server_number}` : ''}
        </Text>
        <Text style={styles.metaText}>
          Created: {new Date(item.created_at).toLocaleString('en-IN')}
        </Text>
        {item.last_error && <Text style={styles.errorText}>Error: {item.last_error}</Text>}
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Offline Sync Status"
        subtitle="ऑफ़लाइन सिंक • SQLite Queue & Cache"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Connection Status Banner */}
        <GlassCard
          variant={isOnline ? 'highlight' : 'danger'}
          style={styles.statusBanner}
        >
          <View style={styles.statusRow}>
            <Ionicons
              name={isOnline ? 'cloud-done' : 'cloud-offline'}
              size={26}
              color={isOnline ? Colors.success : Colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {isOnline ? 'Online • Connected to Cloud' : 'Offline Mode • Saving Locally'}
              </Text>
              <Text style={styles.statusSub}>
                {lastSyncedAt
                  ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString('en-IN')}`
                  : 'Waiting for initial sync'}
              </Text>
            </View>
          </View>
          {lastError && <Text style={styles.errorBanner}>{lastError}</Text>}
        </GlassCard>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{pendingCount}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Failed</Text>
            <Text style={[styles.statValue, { color: Colors.danger }]}>{failedCount}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Synced</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{syncedCount}</Text>
          </GlassCard>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <GlassButton
            title={isSyncing ? 'Syncing...' : 'Sync Queue Now'}
            variant="primary"
            size="md"
            loading={isSyncing}
            disabled={!isOnline}
            onPress={handleSyncNow}
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Refresh Cache"
            variant="secondary"
            size="md"
            disabled={!isOnline || isSyncing}
            onPress={handleRefreshCache}
            style={{ flex: 1 }}
          />
        </View>

        {failedCount > 0 && (
          <GlassButton
            title={`Retry ${failedCount} Failed Operation(s)`}
            variant="danger"
            size="sm"
            onPress={handleRetryFailed}
            style={{ marginBottom: Spacing.sm }}
          />
        )}

        <Text style={styles.listHeading}>Offline Sync Queue (FIFO)</Text>

        <FlatList
          data={queueItems}
          keyExtractor={(item) => item.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadQueue} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>Sync Queue is Empty</Text>
              <Text style={styles.emptySub}>
                All offline transactions have been synchronized with MongoDB Cloud.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  statusBanner: { padding: Spacing.md, marginTop: Spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statusTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  statusSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  errorBanner: { color: Colors.danger, fontSize: 12, marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.sm },
  statCard: { flex: 1, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  listHeading: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  listContent: { paddingBottom: 60 },
  queueCard: { padding: Spacing.md, marginBottom: Spacing.xs },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  metaText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  errorText: { color: Colors.danger, fontSize: 11, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
