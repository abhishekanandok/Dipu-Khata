import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

type ExpenseCategory = 'TRANSPORT' | 'FUEL' | 'LABOUR' | 'MAINTENANCE' | 'SHOP' | 'MISC';
type ExpenseFilter = 'ALL' | ExpenseCategory;

const CATEGORIES: Array<{ id: ExpenseCategory; label: string; hindi: string; icon: string }> = [
  { id: 'FUEL', label: 'Fuel / Diesel', hindi: 'डीज़ल', icon: 'flame-outline' },
  { id: 'LABOUR', label: 'Labour', hindi: 'मज़दूरी', icon: 'people-outline' },
  { id: 'TRANSPORT', label: 'Transport', hindi: 'भाड़ा', icon: 'car-outline' },
  { id: 'MAINTENANCE', label: 'Maintenance', hindi: 'मरम्मत', icon: 'build-outline' },
  { id: 'SHOP', label: 'Shop', hindi: 'दुकान खर्च', icon: 'storefront-outline' },
  { id: 'MISC', label: 'Misc', hindi: 'अन्य', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function ExpensesScreen() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<ExpenseFilter>('ALL');

  // Add Expense Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('FUEL');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    data: expensesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['expenses', categoryFilter],
    queryFn: () =>
      api.getExpenses({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      }),
  });

  const expensesList = expensesData?.data?.expenses || [];
  const summary = expensesData?.data?.summary || {
    totalExpenses: 0,
    cashExpenses: 0,
    digitalExpenses: 0,
  };

  const handleAddExpense = async () => {
    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createExpense({
        category,
        amount: Math.round(amt * 100),
        paymentMethod,
        paidTo: paidTo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowAddModal(false);
      setAmountRupees('');
      setPaidTo('');
      setNotes('');
      await refetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderExpenseItem = ({ item }: { item: any }) => {
    const catMeta = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[5];

    return (
      <GlassCard style={styles.expenseCard}>
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}>
            <Ionicons name={catMeta.icon as any} size={20} color={Colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expenseTitle}>
              {catMeta.label} ({catMeta.hindi})
            </Text>
            <Text style={styles.expenseMeta}>
              #{item.expenseNumber} • {item.paymentMethod}
              {item.paidTo ? ` • To: ${item.paidTo}` : ''}
            </Text>
            {item.notes && <Text style={styles.expenseNotes}>{item.notes}</Text>}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <AmountDisplay amount={item.amount} size="md" color={Colors.danger} />
          <Text style={styles.dateText}>
            {new Date(item.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Daily Expenses"
        subtitle="दैनिक खर्च • Operational Outflows"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Summary Row */}
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Expenses</Text>
            <Text style={[styles.metricValue, { color: Colors.danger }]}>
              {formatCurrency(summary.totalExpenses)}
            </Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cash Outflow</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.cashExpenses)}</Text>
          </GlassCard>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>UPI / Bank</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.digitalExpenses)}</Text>
          </GlassCard>
        </View>

        {/* Add Expense Button */}
        <GlassButton
          title="+ Record New Expense (नया खर्च जोड़ें)"
          variant="primary"
          size="md"
          icon={<Ionicons name="add-circle-outline" size={18} color="#FFF" />}
          onPress={() => setShowAddModal(true)}
          style={styles.addBtn}
        />

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setCategoryFilter('ALL')}
            style={[styles.filterChip, categoryFilter === 'ALL' && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, categoryFilter === 'ALL' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoryFilter(c.id)}
              style={[styles.filterChip, categoryFilter === c.id && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, categoryFilter === c.id && styles.filterTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Expenses List */}
        <FlatList
          data={expensesList}
          keyExtractor={(item) => item._id}
          renderItem={renderExpenseItem}
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
              <View style={styles.emptyBox}>
                <Ionicons name="trending-down-outline" size={48} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
                <Text style={styles.emptySubtitle}>
                  Log diesel, labour, loading, or shop expenses to keep your Cash Book accurate.
                </Text>
              </View>
            ) : undefined
          }
        />
      </View>

      {/* Add Expense Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Expense (खर्च लिखें)</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[styles.catChip, active && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlassInput
              label="Amount (₹) *"
              placeholder="e.g. 500"
              value={amountRupees}
              onChangeText={setAmountRupees}
              keyboardType="decimal-pad"
              prefix="₹"
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {(['CASH', 'UPI', 'BANK'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPaymentMethod(m)}
                  style={[styles.modeChip, paymentMethod === m && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, paymentMethod === m && styles.catChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassInput
              label="Paid To (Optional)"
              placeholder="e.g. Ramu Driver / Petrol Pump"
              value={paidTo}
              onChangeText={setPaidTo}
            />

            <GlassInput
              label="Notes (Optional)"
              placeholder="e.g. Diesel for tractor trip"
              value={notes}
              onChangeText={setNotes}
            />

            <GlassButton
              title="Save Expense"
              variant="primary"
              size="md"
              loading={submitting}
              onPress={handleAddExpense}
              style={{ marginTop: Spacing.sm }}
            />
          </GlassCard>
        </View>
      )}
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
  addBtn: { marginVertical: Spacing.sm },
  filterScroll: { maxHeight: 38, marginBottom: Spacing.sm },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: Spacing.xs,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  listContent: { paddingBottom: 60 },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dangerGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  expenseMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  expenseNotes: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  dateText: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: { width: '100%', padding: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  inputLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  catChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  catChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  catChipTextActive: { color: Colors.primaryLight },
  modeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
});
