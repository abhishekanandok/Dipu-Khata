import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { formatCurrency, AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';

type PaymentFilter = 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID';

export default function SalesTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');

  const {
    data: salesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['sales', search, paymentFilter],
    queryFn: () =>
      api.getSales({
        search: search.trim() || undefined,
        paymentStatus: paymentFilter === 'ALL' ? undefined : paymentFilter,
      }),
  });

  const salesList = salesData?.data?.sales || [];
  const summary = salesData?.data?.summary || { totalInvoiced: 0, totalPaid: 0, totalDue: 0 };

  const renderSaleItem = ({ item }: { item: any }) => {
    const isPaid = item.paymentStatus === 'PAID';
    const isPartial = item.paymentStatus === 'PARTIAL';
    const itemsText = (item.items || [])
      .map((i: any) => `${i.materialName} (${i.quantity} ${i.unit})`)
      .join(', ');

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/sales/${item._id}`)}
      >
        <GlassCard style={styles.saleCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.invoiceNumber}>#{item.invoiceNumber}</Text>
              <Text style={styles.dateText}>
                {new Date(item.saleDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <StatusBadge
              status={
                isPaid
                  ? 'COMPLETED'
                  : isPartial
                  ? 'PARTIAL'
                  : 'PENDING'
              }
              label={
                isPaid
                  ? 'Paid (नकद)'
                  : isPartial
                  ? 'Partial (आंशिक)'
                  : 'Unpaid (बाकी)'
              }
            />
          </View>

          <View style={styles.customerRow}>
            <Ionicons name="person-circle-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.customerMobile}>• {item.customerMobile}</Text>
          </View>

          <Text style={styles.itemsSummary} numberOfLines={1}>
            {itemsText || 'General construction supplies'}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>Total Bill</Text>
              <AmountDisplay amount={item.grandTotal} size="sm" />
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>Received</Text>
              <AmountDisplay amount={item.amountPaid} size="sm" color={Colors.success} />
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>Balance Due</Text>
              <AmountDisplay
                amount={item.balanceDue}
                size="sm"
                color={item.balanceDue > 0 ? Colors.danger : Colors.textMuted}
              />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Sales & Billing"
        subtitle="बिक्री एवं इनवॉइस • Retail Counter"
      />

      <View style={styles.container}>
        {/* Metric Cards Banner */}
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Invoiced</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalInvoiced)}</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cash/UPI Recd.</Text>
            <Text style={[styles.metricValue, { color: Colors.success }]}>
              {formatCurrency(summary.totalPaid)}
            </Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Khata Due</Text>
            <Text style={[styles.metricValue, { color: Colors.danger }]}>
              {formatCurrency(summary.totalDue)}
            </Text>
          </GlassCard>
        </View>

        {/* Quick Action Navigation Bar */}
        <View style={styles.actionBar}>
          <GlassButton
            title="+ New Bill (नया बिल)"
            variant="primary"
            size="md"
            icon={<Ionicons name="receipt-outline" size={18} color="#FFF" />}
            onPress={() => router.push('/sales/new')}
            style={styles.actionBtnPrimary}
          />
          <GlassButton
            title="Estimates (कोटेशन)"
            variant="secondary"
            size="md"
            icon={<Ionicons name="document-text-outline" size={18} color={Colors.textPrimary} />}
            onPress={() => router.push('/estimates')}
            style={styles.actionBtnSecondary}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search invoice #, customer name or phone..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterChipsRow}>
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as PaymentFilter[]).map((filter) => {
            const active = paymentFilter === filter;
            const labelMap: Record<PaymentFilter, string> = {
              ALL: 'All Bills',
              UNPAID: 'Unpaid (बाकी)',
              PARTIAL: 'Partial',
              PAID: 'Paid (नकद)',
            };
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setPaymentFilter(filter)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {labelMap[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sales List */}
        <FlatList
          data={salesList}
          keyExtractor={(item) => item._id}
          renderItem={renderSaleItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={54} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Invoices Found</Text>
                <Text style={styles.emptySubtitle}>
                  {search ? 'Try adjusting your search criteria' : 'Create your first counter sale bill.'}
                </Text>
                <GlassButton
                  title="+ Create First Bill"
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/sales/new')}
                  style={styles.emptyBtn}
                />
              </View>
            ) : undefined
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  metricCard: { flex: 1, padding: Spacing.sm, alignItems: 'center' },
  metricLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  metricValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 3 },
  actionBar: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.sm },
  actionBtnPrimary: { flex: 1.2 },
  actionBtnSecondary: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 42,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  filterChipsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primary,
  },
  filterChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  listContent: { paddingBottom: 100 },
  saleCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  dateText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  customerName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  customerMobile: { color: Colors.textSecondary, fontSize: 12 },
  itemsSummary: { color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  amountCol: { alignItems: 'flex-start' },
  amountLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  emptyBtn: { marginTop: Spacing.lg },
});
