import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

type ReportTab = 'PL' | 'SALES' | 'CASHFLOW' | 'STOCK';
type DatePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export default function FinancialReportsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReportTab>('PL');
  const [datePreset, setDatePreset] = useState<DatePreset>('MONTH');

  const dateParams = useMemo(() => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];

    if (datePreset === 'ALL') return {};
    if (datePreset === 'TODAY') return { startDate: endDate, endDate };
    if (datePreset === 'WEEK') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate };
    }
    // MONTH
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: firstDay.toISOString().split('T')[0], endDate };
  }, [datePreset]);

  const plQuery = useQuery({
    queryKey: ['reportPL', dateParams],
    queryFn: () => api.getProfitLossReport(dateParams),
    enabled: activeTab === 'PL',
  });

  const salesQuery = useQuery({
    queryKey: ['reportSales', dateParams],
    queryFn: () => api.getSalesSummaryReport(dateParams),
    enabled: activeTab === 'SALES',
  });

  const cashFlowQuery = useQuery({
    queryKey: ['reportCashFlow', dateParams],
    queryFn: () => api.getCashFlowReport(dateParams),
    enabled: activeTab === 'CASHFLOW',
  });

  const stockQuery = useQuery({
    queryKey: ['reportStock'],
    queryFn: api.getStockValuationReport,
    enabled: activeTab === 'STOCK',
  });

  const isLoading =
    (activeTab === 'PL' && plQuery.isLoading) ||
    (activeTab === 'SALES' && salesQuery.isLoading) ||
    (activeTab === 'CASHFLOW' && cashFlowQuery.isLoading) ||
    (activeTab === 'STOCK' && stockQuery.isLoading);

  const handleRefresh = () => {
    if (activeTab === 'PL') plQuery.refetch();
    else if (activeTab === 'SALES') salesQuery.refetch();
    else if (activeTab === 'CASHFLOW') cashFlowQuery.refetch();
    else stockQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Financial Reports"
        subtitle="व्यापार रिपोर्ट • Profit, Cash Flow & Valuation"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Report Type Tabs */}
        <View style={styles.tabsRow}>
          {(
            [
              { id: 'PL', label: 'Profit & Loss' },
              { id: 'SALES', label: 'Sales' },
              { id: 'CASHFLOW', label: 'Cash Flow' },
              { id: 'STOCK', label: 'Stock Value' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Filter Pills (not shown for Stock Valuation) */}
        {activeTab !== 'STOCK' && (
          <View style={styles.dateRow}>
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: 'WEEK', label: '7 Days' },
                { id: 'MONTH', label: 'This Month' },
                { id: 'ALL', label: 'All Time' },
              ] as const
            ).map((d) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => setDatePreset(d.id)}
                style={[styles.dateChip, datePreset === d.id && styles.dateChipActive]}
              >
                <Text style={[styles.dateChipText, datePreset === d.id && styles.dateChipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View>
              {/* TAB 1: PROFIT & LOSS */}
              {activeTab === 'PL' && plQuery.data && (
                <View>
                  <GlassCard variant="highlight" style={styles.heroCard}>
                    <Text style={styles.heroLabel}>Net Profit (शुद्ध लाभ)</Text>
                    <Text
                      style={[
                        styles.heroValue,
                        { color: plQuery.data.netProfit >= 0 ? Colors.success : Colors.danger },
                      ]}
                    >
                      {formatCurrency(plQuery.data.netProfit)}
                    </Text>
                    <Text style={styles.heroSub}>
                      Net Margin: {plQuery.data.netMarginPercent}% • Gross Margin:{' '}
                      {plQuery.data.grossMarginPercent}%
                    </Text>
                  </GlassCard>

                  <GlassCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Revenue & Cost Breakdown</Text>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Total Sales Revenue ({plQuery.data.revenue.billsCount} bills)</Text>
                      <Text style={styles.rowVal}>{formatCurrency(plQuery.data.revenue.totalRevenue)}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Cost of Goods Sold (COGS)</Text>
                      <Text style={[styles.rowVal, { color: Colors.danger }]}>
                        -{formatCurrency(plQuery.data.cogs.totalCogs)}
                      </Text>
                    </View>
                    <View style={[styles.row, styles.dividerRow]}>
                      <Text style={styles.rowLabelBold}>Gross Profit</Text>
                      <Text style={[styles.rowValBold, { color: Colors.primaryLight }]}>
                        {formatCurrency(plQuery.data.grossProfit)}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Operating Expenses</Text>
                      <Text style={[styles.rowVal, { color: Colors.danger }]}>
                        -{formatCurrency(plQuery.data.operatingExpenses.totalOperatingExpenses)}
                      </Text>
                    </View>
                  </GlassCard>

                  {plQuery.data.operatingExpenses.byCategory.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>Expenses by Category</Text>
                      {plQuery.data.operatingExpenses.byCategory.map((c: any) => (
                        <View key={c.category} style={styles.row}>
                          <Text style={styles.rowLabel}>{c.category}</Text>
                          <Text style={styles.rowVal}>{formatCurrency(c.amount)}</Text>
                        </View>
                      ))}
                    </GlassCard>
                  )}
                </View>
              )}

              {/* TAB 2: SALES & MATERIAL VOLUME */}
              {activeTab === 'SALES' && salesQuery.data && (
                <View>
                  <GlassCard variant="highlight" style={styles.heroCard}>
                    <Text style={styles.heroLabel}>
                      Total Sales ({salesQuery.data.summary.totalBills} Bills)
                    </Text>
                    <Text style={styles.heroValue}>
                      {formatCurrency(salesQuery.data.summary.totalRevenue)}
                    </Text>
                    <Text style={styles.heroSub}>
                      Collected: {formatCurrency(salesQuery.data.summary.totalCollected)} • Due:{' '}
                      {formatCurrency(salesQuery.data.summary.totalDue)}
                    </Text>
                  </GlassCard>

                  <GlassCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Material-wise Sales Volume</Text>
                    {salesQuery.data.materialBreakdown.length === 0 ? (
                      <Text style={styles.emptyText}>No material sales in this period.</Text>
                    ) : (
                      salesQuery.data.materialBreakdown.map((m: any, idx: number) => (
                        <View key={idx} style={styles.row}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabelBold}>{m.materialName}</Text>
                            <Text style={styles.rowSub}>
                              {m.totalQuantity} {m.unit} sold ({m.billCount} bills)
                            </Text>
                          </View>
                          <Text style={styles.rowValBold}>{formatCurrency(m.totalRevenue)}</Text>
                        </View>
                      ))
                    )}
                  </GlassCard>
                </View>
              )}

              {/* TAB 3: CASH FLOW */}
              {activeTab === 'CASHFLOW' && cashFlowQuery.data && (
                <View>
                  <GlassCard variant="highlight" style={styles.heroCard}>
                    <Text style={styles.heroLabel}>Net Cash Flow (शुद्ध नकदी प्रवाह)</Text>
                    <Text
                      style={[
                        styles.heroValue,
                        {
                          color:
                            cashFlowQuery.data.netCashFlow >= 0 ? Colors.success : Colors.danger,
                        },
                      ]}
                    >
                      {formatCurrency(cashFlowQuery.data.netCashFlow)}
                    </Text>
                    <Text style={styles.heroSub}>
                      Cash In Hand: {formatCurrency(cashFlowQuery.data.netCashInHand)} • Digital:{' '}
                      {formatCurrency(cashFlowQuery.data.netDigitalFlow)}
                    </Text>
                  </GlassCard>

                  <GlassCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Inflows vs Outflows</Text>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Total Cash Inflow</Text>
                      <Text style={[styles.rowVal, { color: Colors.success }]}>
                        +{formatCurrency(cashFlowQuery.data.inflows.cashInflow)}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Total UPI / Bank Inflow</Text>
                      <Text style={[styles.rowVal, { color: Colors.info }]}>
                        +{formatCurrency(cashFlowQuery.data.inflows.digitalInflow)}
                      </Text>
                    </View>
                    <View style={[styles.row, styles.dividerRow]}>
                      <Text style={styles.rowLabel}>Purchase Payments Outflow</Text>
                      <Text style={[styles.rowVal, { color: Colors.danger }]}>
                        -{formatCurrency(cashFlowQuery.data.outflows.purchaseOutflow)}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Business Expenses Outflow</Text>
                      <Text style={[styles.rowVal, { color: Colors.danger }]}>
                        -{formatCurrency(cashFlowQuery.data.outflows.expenseOutflow)}
                      </Text>
                    </View>
                  </GlassCard>
                </View>
              )}

              {/* TAB 4: STOCK VALUATION */}
              {activeTab === 'STOCK' && stockQuery.data && (
                <View>
                  <GlassCard variant="highlight" style={styles.heroCard}>
                    <Text style={styles.heroLabel}>Inventory Retail Valuation</Text>
                    <Text style={styles.heroValue}>
                      {formatCurrency(stockQuery.data.summary.totalRetailValue)}
                    </Text>
                    <Text style={styles.heroSub}>
                      Cost Value: {formatCurrency(stockQuery.data.summary.totalCostValue)} •
                      Projected Profit: {formatCurrency(stockQuery.data.summary.projectedProfit)}
                    </Text>
                  </GlassCard>

                  <GlassCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Valuation by Category</Text>
                    {stockQuery.data.byCategory.map((cat: any) => (
                      <View key={cat.category} style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowLabelBold}>{cat.category}</Text>
                          <Text style={styles.rowSub}>
                            {cat.itemCount} materials • Cost: {formatCurrency(cat.costValue)}
                          </Text>
                        </View>
                        <Text style={styles.rowValBold}>{formatCurrency(cat.retailValue)}</Text>
                      </View>
                    ))}
                  </GlassCard>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginTop: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabBtnActive: { backgroundColor: Colors.primaryGlass },
  tabText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  dateChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
  },
  dateChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  dateChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  dateChipTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  scrollContent: { paddingTop: Spacing.md, paddingBottom: 60 },
  heroCard: { padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  heroLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800', marginVertical: 4 },
  heroSub: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dividerRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    marginTop: 4,
    paddingTop: 8,
  },
  rowLabel: { color: Colors.textSecondary, fontSize: 13 },
  rowLabelBold: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  rowSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  rowVal: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  rowValBold: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
