import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

export default function DailyCashBookScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const {
    data: cashBook,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['cashBook', selectedDate],
    queryFn: () => api.getCashBook({ date: selectedDate }),
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Daily Cash Book"
        subtitle="दैनिक रोकड़ बही • Cash Drawer & Digital Reconciliation"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Date Navigator Bar */}
        <View style={styles.dateBar}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToday} style={styles.dateCenter}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.dateText}>
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextDay} style={styles.dateNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {isLoading || !cashBook ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Reconciling daily transactions...</Text>
          </View>
        ) : (
          <View>
            {/* Grand Total Inflow Banner */}
            <GlassCard variant="highlight" style={styles.grandCard}>
              <Text style={styles.grandLabel}>Total Inflow Today (कुल प्राप्त)</Text>
              <Text style={styles.grandAmount}>
                {formatCurrency(cashBook.summary.totalInflow)}
              </Text>
              <Text style={styles.grandCount}>
                Across {cashBook.summary.transactionsCount} transaction(s) recorded
              </Text>
            </GlassCard>

            {/* Split Breakdown: Cash Drawer vs Digital Bank */}
            <View style={styles.splitRow}>
              {/* Box 1: Physical Cash in Drawer */}
              <GlassCard style={styles.halfCard}>
                <View style={styles.cardTopRow}>
                  <Ionicons name="cash" size={22} color={Colors.success} />
                  <Text style={styles.boxTitle}>Cash in Drawer</Text>
                </View>
                <Text style={styles.boxHindi}>गल्ला (नकद रोकड़)</Text>

                <View style={styles.statLine}>
                  <Text style={styles.statLabel}>Counter Sales</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(cashBook.cashDrawer.cashSales)}
                  </Text>
                </View>

                <View style={styles.statLine}>
                  <Text style={styles.statLabel}>Debt Collections</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(cashBook.cashDrawer.cashCollections)}
                  </Text>
                </View>

                <View style={styles.boxTotalRow}>
                  <Text style={styles.boxTotalLabel}>Total Cash:</Text>
                  <AmountDisplay
                    amount={cashBook.cashDrawer.totalCashInflow}
                    size="md"
                    color={Colors.success}
                  />
                </View>
              </GlassCard>

              {/* Box 2: Digital UPI / Bank */}
              <GlassCard style={styles.halfCard}>
                <View style={styles.cardTopRow}>
                  <Ionicons name="phone-portrait" size={22} color={Colors.info} />
                  <Text style={styles.boxTitle}>UPI & Online</Text>
                </View>
                <Text style={styles.boxHindi}>बैंक एवं यूपीआई</Text>

                <View style={styles.statLine}>
                  <Text style={styles.statLabel}>UPI Sales</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(cashBook.digitalAccounts.upiSales)}
                  </Text>
                </View>

                <View style={styles.statLine}>
                  <Text style={styles.statLabel}>UPI Collections</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(cashBook.digitalAccounts.upiCollections)}
                  </Text>
                </View>

                <View style={styles.boxTotalRow}>
                  <Text style={styles.boxTotalLabel}>Total UPI:</Text>
                  <AmountDisplay
                    amount={cashBook.digitalAccounts.totalDigitalInflow}
                    size="md"
                    color={Colors.info}
                  />
                </View>
              </GlassCard>
            </View>

            {/* Inflows Transaction Stream */}
            <Text style={styles.streamHeading}>Today's Inflow Stream (प्राप्ति विवरण)</Text>

            {cashBook.transactions.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>No cash or UPI inflows recorded on this date.</Text>
              </GlassCard>
            ) : (
              cashBook.transactions.map((tx: any, idx: number) => {
                const isCash = tx.method === 'CASH';

                return (
                  <GlassCard key={idx} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIconCircle,
                          { backgroundColor: isCash ? Colors.successGlass : Colors.infoGlass },
                        ]}
                      >
                        <Ionicons
                          name={isCash ? 'cash-outline' : 'phone-portrait-outline'}
                          size={18}
                          color={isCash ? Colors.success : Colors.info}
                        />
                      </View>
                      <View>
                        <Text style={styles.txCustName}>{tx.customerName}</Text>
                        <Text style={styles.txDesc}>
                          {tx.type === 'SALE_PAYMENT' ? `Sale #${tx.invoiceNumber}` : `Receipt #${tx.paymentNumber}`} • {tx.method}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <AmountDisplay
                        amount={tx.amount}
                        size="md"
                        color={isCash ? Colors.success : Colors.info}
                      />
                      <Text style={styles.txTime}>
                        {new Date(tx.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 60 },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateNavBtn: { padding: 8 },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: 14 },
  grandCard: { padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  grandLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  grandAmount: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800', marginVertical: 4 },
  grandCount: { color: Colors.textMuted, fontSize: 12 },
  splitRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  halfCard: { flex: 1, padding: Spacing.md },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boxTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  boxHindi: { color: Colors.textMuted, fontSize: 11, marginBottom: Spacing.sm },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },
  statValue: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },
  boxTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  boxTotalLabel: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
  streamHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  emptyCard: { padding: Spacing.lg, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCustName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  txDesc: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  txTime: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
});
