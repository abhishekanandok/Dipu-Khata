import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_month';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<DateFilter>('today');

  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboardSummary', filter],
    queryFn: () => api.getDashboardSummary(filter),
  });

  const filterOptions: Array<{ id: DateFilter; label: string; hindi: string }> = [
    { id: 'today', label: 'Today', hindi: 'आज' },
    { id: 'yesterday', label: 'Yesterday', hindi: 'कल' },
    { id: 'this_week', label: 'This Week', hindi: 'हफ्ता' },
    { id: 'this_month', label: 'This Month', hindi: 'महीना' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Dipu Khata & Trade"
        subtitle={`नमस्ते, ${user?.name || 'व्यापारी'} • Live Dashboard`}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => refetch()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isRefetching ? 'sync' : 'refresh'}
              size={18}
              color={Colors.primaryLight}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Date Filter Pills */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filterOptions.map((opt) => {
              const active = filter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {opt.label} <Text style={styles.filterHindiText}>({opt.hindi})</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Primary Financial Overview Cards */}
        <View style={styles.gridRow}>
          {/* Card 1: Sales */}
          <GlassCard variant="highlight" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Total Sales (कुल बिक्री)</Text>
              <Ionicons name="cart-outline" size={18} color={Colors.primaryLight} />
            </View>
            <AmountDisplay
              amountInPaise={summary?.sales?.totalSales || 0}
              size="lg"
              color={Colors.textPrimary}
            />
            <View style={styles.metricSubRow}>
              <Text style={styles.metricSub}>
                {summary?.sales?.salesCount || 0} Bills • Credit:
              </Text>
              <AmountDisplay
                amountInPaise={summary?.sales?.creditSales || 0}
                size="sm"
                color={Colors.danger}
              />
            </View>
          </GlassCard>

          {/* Card 2: Cash & Collections */}
          <GlassCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Collections (जमा वसूली)</Text>
              <Ionicons name="wallet-outline" size={18} color={Colors.success} />
            </View>
            <AmountDisplay
              amountInPaise={summary?.collections?.totalCollections || 0}
              size="lg"
              color={Colors.success}
            />
            <View style={styles.metricSubRow}>
              <Text style={styles.metricSub}>
                Cash: ₹{((summary?.collections?.cashAmount || 0) / 100).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.metricSub}>
                UPI: ₹{((summary?.collections?.upiAmount || 0) / 100).toLocaleString('en-IN')}
              </Text>
            </View>
          </GlassCard>
        </View>

        <View style={styles.gridRow}>
          {/* Card 3: Market Outstanding */}
          <GlassCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Market Dues (बाज़ार उधारी)</Text>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
            </View>
            <AmountDisplay
              amountInPaise={summary?.outstanding?.totalReceivable || 0}
              size="lg"
              color={Colors.danger}
            />
            <Text style={styles.metricSub}>
              {summary?.outstanding?.customersWithDuesCount || 0} Customers with dues
            </Text>
          </GlassCard>

          {/* Card 4: Inventory Asset Value */}
          <GlassCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Stock Value (स्टॉक मूल्य)</Text>
              <Ionicons name="cube-outline" size={18} color={Colors.info} />
            </View>
            <AmountDisplay
              amountInPaise={summary?.inventory?.totalAssetValue || 0}
              size="lg"
              color={Colors.textPrimary}
            />
            <View style={styles.metricSubRow}>
              <Text style={styles.metricSub}>Low Stock:</Text>
              <StatusBadge
                label={`${summary?.inventory?.lowStockCount || 0} items`}
                variant={summary?.inventory?.lowStockCount ? 'warning' : 'success'}
              />
            </View>
          </GlassCard>
        </View>

        {/* Quick Actions (Floating Grid) */}
        <Text style={styles.sectionHeading}>Quick Actions (त्वरित कार्य)</Text>
        <View style={styles.quickActionGrid}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/sales/new')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(13, 148, 136, 0.2)' }]}>
              <Ionicons name="add-circle" size={24} color={Colors.primaryLight} />
            </View>
            <Text style={styles.quickActionTitle}>New Sale</Text>
            <Text style={styles.quickActionHindi}>बिक्री</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/customers/add')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Ionicons name="person-add" size={22} color={Colors.info} />
            </View>
            <Text style={styles.quickActionTitle}>Add Customer</Text>
            <Text style={styles.quickActionHindi}>नया ग्राहक</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/payments/receive')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="cash" size={22} color={Colors.success} />
            </View>
            <Text style={styles.quickActionTitle}>Receive Payment</Text>
            <Text style={styles.quickActionHindi}>जमा लें</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/estimates')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="document-text" size={22} color={Colors.warning} />
            </View>
            <Text style={styles.quickActionTitle}>Estimate</Text>
            <Text style={styles.quickActionHindi}>एस्टीमेट</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/stock')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
              <Ionicons name="cube" size={22} color="#A855F7" />
            </View>
            <Text style={styles.quickActionTitle}>Add Stock</Text>
            <Text style={styles.quickActionHindi}>माल आवक</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Ionicons name="newspaper" size={22} color={Colors.danger} />
            </View>
            <Text style={styles.quickActionTitle}>New Chalan</Text>
            <Text style={styles.quickActionHindi}>चालान बनाएं</Text>
          </TouchableOpacity>
        </View>

        {/* Low Stock Alert Section (If Any) */}
        {summary?.inventory?.lowStockMaterials && summary.inventory.lowStockMaterials.length > 0 && (
          <GlassCard variant="danger" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={18} color={Colors.danger} />
              <Text style={styles.alertTitle}>Low Stock Notice (स्टॉक अलर्ट)</Text>
            </View>
            {summary.inventory.lowStockMaterials.map((item: any) => (
              <View key={item.id} style={styles.alertItemRow}>
                <Text style={styles.alertItemName}>
                  {item.name} {item.hindiName ? `(${item.hindiName})` : ''}
                </Text>
                <Text style={styles.alertItemStock}>
                  {item.currentStock} {item.unit} left (Min: {item.minAlert})
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Recent Transactions Feed */}
        <Text style={styles.sectionHeading}>Recent Transactions (हाल की प्रविष्टियां)</Text>
        <GlassCard style={styles.transactionsCard}>
          {summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
            summary.recentTransactions.map((tx: any, idx: number) => (
              <View
                key={tx.id}
                style={[styles.txRow, idx > 0 && styles.txRowDivider]}
              >
                <View style={styles.txIcon}>
                  <Ionicons
                    name={tx.type === 'SALE' ? 'receipt-outline' : 'cash-outline'}
                    size={20}
                    color={tx.type === 'SALE' ? Colors.primaryLight : Colors.success}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                </View>
                <View style={styles.txAmountCol}>
                  <AmountDisplay
                    amountInPaise={tx.amount}
                    color={tx.type === 'SALE' ? Colors.textPrimary : Colors.success}
                    size="md"
                  />
                  <Text style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyFeed}>
              <Ionicons name="file-tray-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions recorded for this period</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 90, // Clearance for bottom tabs
  },
  headerBtn: {
    padding: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterContainer: {
    marginBottom: Spacing.md,
  },
  filterScroll: {
    gap: Spacing.sm,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primaryLight,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterHindiText: {
    fontSize: 11,
    opacity: 0.8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metricSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metricSub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickActionBtn: {
    width: '31%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionHindi: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  alertCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  alertItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  alertItemName: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
  alertItemStock: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  txRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  txDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txDate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
