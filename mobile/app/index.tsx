import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing } from '../constants/theme';
import { GlassCard } from '../components/glass/GlassCard';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassHeader } from '../components/glass/GlassHeader';
import { AmountDisplay } from '../components/common/AmountDisplay';
import { StatusBadge } from '../components/common/StatusBadge';
import { api, API_BASE_URL } from '../services/api';

export default function HomeScreen() {
  const { data: health, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: api.getHealth,
    retry: 1,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Dipu Khata & Trade"
        subtitle="दीपु खाता एवं व्यापार • Retail Management"
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Phase 0 System Verification Banner */}
        <GlassCard variant="highlight" style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Phase 0: Foundation Status</Text>
            <StatusBadge
              label={health?.status === 'healthy' ? 'ACTIVE' : 'INITIALIZING'}
              variant={health?.status === 'healthy' ? 'success' : 'warning'}
            />
          </View>

          <Text style={styles.textSecondary}>
            Backend Endpoint: <Text style={styles.codeText}>{API_BASE_URL}</Text>
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Database</Text>
              <Text style={styles.statValue}>
                {health?.database.connected ? 'MongoDB Atlas' : 'Connecting...'}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Uptime</Text>
              <Text style={styles.statValue}>{health?.uptime ?? '—'}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Liquid Glass UI Component Showcase */}
        <Text style={styles.groupHeading}>Liquid Glass Design Preview</Text>

        <View style={styles.gridRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Today's Sales</Text>
            <AmountDisplay amountInPaise={4520000} size="lg" color={Colors.textPrimary} />
            <Text style={styles.metricSub}>4 Invoices generated</Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Market Dues (उधारी)</Text>
            <AmountDisplay amountInPaise={12500000} size="lg" color={Colors.danger} />
            <Text style={styles.metricSub}>18 Customers</Text>
          </GlassCard>
        </View>

        {/* Material Unit Sample */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Material Catalog Preview</Text>
          
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>Balu / बालू (Local Sand)</Text>
              <Text style={styles.itemMeta}>Rate: ₹45 / CFT</Text>
            </View>
            <StatusBadge label="In Stock" hindiLabel="उपलब्ध" variant="success" />
          </View>

          <View style={[styles.itemRow, styles.itemDivider]}>
            <View>
              <Text style={styles.itemName}>Cement ACC Gold (F2R)</Text>
              <Text style={styles.itemMeta}>Rate: ₹380 / Bag</Text>
            </View>
            <StatusBadge label="Low Stock" hindiLabel="कम स्टॉक" variant="warning" />
          </View>

          <View style={[styles.itemRow, styles.itemDivider]}>
            <View>
              <Text style={styles.itemName}>Steel Rods 12mm TMT</Text>
              <Text style={styles.itemMeta}>Rate: ₹6,200 / Quintal</Text>
            </View>
            <StatusBadge label="In Stock" hindiLabel="उपलब्ध" variant="success" />
          </View>
        </GlassCard>

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          <GlassButton
            title={isLoading ? 'Verifying Backend...' : 'Verify Backend Connectivity'}
            onPress={() => refetch()}
            loading={isLoading}
            variant="primary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  groupHeading: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  textSecondary: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  codeText: {
    color: Colors.primaryLight,
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  metricSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
});
