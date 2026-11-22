import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { GlassCard } from '../components/glass/GlassCard';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassHeader } from '../components/glass/GlassHeader';
import { AmountDisplay } from '../components/common/AmountDisplay';
import { StatusBadge } from '../components/common/StatusBadge';
import { api, API_BASE_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: health, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: api.getHealth,
    retry: 1,
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Dipu Khata & Trade"
        subtitle="दीपु खाता एवं व्यापार • Retail Management"
        rightAction={
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        }
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
        {/* User Session Banner (Phase 1) */}
        <GlassCard variant="highlight" style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Authorized Operator'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'Logged in'}</Text>
            </View>
            <StatusBadge
              label={user?.role?.toUpperCase() || 'ADMIN'}
              variant="info"
            />
          </View>

          <View style={styles.userActionsRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => router.push('/(auth)/change-password')}
            >
              <Ionicons name="key-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.actionPillText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPill, styles.logoutPill]}
              onPress={handleLogout}
            >
              <Ionicons name="exit-outline" size={14} color={Colors.danger} />
              <Text style={[styles.actionPillText, { color: Colors.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Phase Verification Status */}
        <GlassCard style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Backend & Database Status</Text>
            <StatusBadge
              label={health?.status === 'healthy' ? 'CONNECTED' : 'CONNECTING'}
              variant={health?.status === 'healthy' ? 'success' : 'warning'}
            />
          </View>

          <Text style={styles.textSecondary}>
            API Endpoint: <Text style={styles.codeText}>{API_BASE_URL}</Text>
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Database</Text>
              <Text style={styles.statValue}>
                {health?.database.connected ? 'MongoDB Atlas' : 'Connecting...'}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Session State</Text>
              <Text style={styles.statValue}>Active (JWT Bearer)</Text>
            </View>
          </View>
        </GlassCard>

        {/* Business Metrics Preview */}
        <Text style={styles.groupHeading}>Store Ledger Preview</Text>

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

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          <GlassButton
            title={isLoading ? 'Verifying Services...' : 'Refresh Health Status'}
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
  logoutBtn: {
    padding: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  card: {
    marginBottom: Spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  logoutPill: {
    backgroundColor: Colors.dangerGlass,
  },
  actionPillText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
  actionContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
});
