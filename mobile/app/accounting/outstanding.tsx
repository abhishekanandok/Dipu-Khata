import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

type BracketFilter = 'ALL' | '0-30' | '31-60' | '61+';

export default function OutstandingDuesScreen() {
  const router = useRouter();
  const [selectedBracket, setSelectedBracket] = useState<BracketFilter>('ALL');

  const {
    data: outstandingData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['outstandingDues'],
    queryFn: api.getOutstandingDues,
  });

  const summary = outstandingData?.summary || {
    totalOutstanding: 0,
    totalCustomersWithDues: 0,
    agingBrackets: { bracket0To30: 0, bracket31To60: 0, bracket61Plus: 0 },
  };

  const allCustomers = outstandingData?.customers || [];
  const filteredCustomers = allCustomers.filter((c: any) => {
    if (selectedBracket === 'ALL') return true;
    return c.bracket === selectedBracket;
  });

  const handleCall = (mobile: string) => {
    if (mobile) Linking.openURL(`tel:${mobile}`);
  };

  const handleWhatsAppReminder = (customer: any) => {
    const msg = `*गिट्टी बालू डिपो (GittiBalu Depo)*\n` +
      `आदरणीय ${customer.name} जी,\n\n` +
      `आपके खाते का बकाया राशि: *₹${(customer.currentBalance / 100).toFixed(2)}* है।\n` +
      `कृपया इसे जल्द से जल्द चुकता करने का कष्ट करें।\n\n` +
      `धन्यवाद! 🙏`;

    const cleanMobile = customer.mobile?.replace(/\D/g, '') || '';
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const renderCustomerItem = ({ item }: { item: any }) => {
    const isCritical = item.bracket === '61+';
    const isAging = item.bracket === '31-60';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/customers/${item._id}`)}
      >
        <GlassCard style={styles.custCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{item.name}</Text>
              <Text style={styles.custPhone}>
                {item.mobile} {item.village ? `• ${item.village}` : ''}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AmountDisplay amount={item.currentBalance} size="md" color={Colors.danger} />
              <View
                style={[
                  styles.ageBadge,
                  isCritical
                    ? styles.ageBadgeCritical
                    : isAging
                    ? styles.ageBadgeAging
                    : styles.ageBadgeFresh,
                ]}
              >
                <Text
                  style={[
                    styles.ageBadgeText,
                    isCritical
                      ? styles.ageTextCritical
                      : isAging
                      ? styles.ageTextAging
                      : styles.ageTextFresh,
                  ]}
                >
                  {item.ageDays} days old ({item.bracket})
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleCall(item.mobile)}
              style={styles.actionBtn}
            >
              <Ionicons name="call" size={16} color={Colors.primaryLight} />
              <Text style={styles.actionBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleWhatsAppReminder(item)}
              style={[styles.actionBtn, styles.actionBtnWhatsApp]}
            >
              <Ionicons name="logo-whatsapp" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>
                WhatsApp Reminder
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/payments/receive?customerId=${item._id}`)}
              style={[styles.actionBtn, styles.actionBtnCollect]}
            >
              <Ionicons name="cash" size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Receive</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Outstanding Receivables"
        subtitle="बाकी वसूली सूची • Aged Market Credit"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Market Dues Summary Card */}
        <GlassCard variant="danger" style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryTitle}>Total Market Due (कुल बाकी)</Text>
            <Text style={styles.summaryCustCount}>{summary.totalCustomersWithDues} Parties</Text>
          </View>
          <Text style={styles.summaryAmount}>
            {formatCurrency(summary.totalOutstanding)}
          </Text>

          {/* Aging Brackets Columns */}
          <View style={styles.bracketsRow}>
            <View style={styles.bracketCol}>
              <Text style={styles.bracketTitle}>0-30 Days</Text>
              <Text style={styles.bracketValue}>
                {formatCurrency(summary.agingBrackets.bracket0To30)}
              </Text>
            </View>
            <View style={styles.bracketCol}>
              <Text style={styles.bracketTitle}>31-60 Days</Text>
              <Text style={[styles.bracketValue, { color: Colors.warning }]}>
                {formatCurrency(summary.agingBrackets.bracket31To60)}
              </Text>
            </View>
            <View style={styles.bracketCol}>
              <Text style={styles.bracketTitle}>60+ Days</Text>
              <Text style={[styles.bracketValue, { color: Colors.danger }]}>
                {formatCurrency(summary.agingBrackets.bracket61Plus)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(
            [
              { id: 'ALL', label: `All (${allCustomers.length})` },
              { id: '0-30', label: '0-30 Days' },
              { id: '31-60', label: '31-60 Days' },
              { id: '61+', label: '60+ Days (Critical)' },
            ] as const
          ).map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setSelectedBracket(b.id)}
              style={[styles.filterChip, selectedBracket === b.id && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedBracket === b.id && styles.filterChipTextActive]}>
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Customers List */}
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item._id}
          renderItem={renderCustomerItem}
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
                <Ionicons name="checkmark-done-circle" size={48} color={Colors.success} />
                <Text style={styles.emptyTitle}>No Outstanding Dues in this bracket!</Text>
                <Text style={styles.emptySubtitle}>All customer dues are settled.</Text>
              </View>
            ) : (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  summaryCard: { padding: Spacing.md, marginVertical: Spacing.sm },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { color: Colors.danger, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  summaryCustCount: { color: Colors.textMuted, fontSize: 12 },
  summaryAmount: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', marginVertical: 4 },
  bracketsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  bracketCol: { alignItems: 'flex-start' },
  bracketTitle: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase' },
  bracketValue: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  listContent: { paddingBottom: 60 },
  custCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  custName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  custPhone: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  ageBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  ageBadgeFresh: { backgroundColor: Colors.primaryGlass },
  ageBadgeAging: { backgroundColor: Colors.warningGlass },
  ageBadgeCritical: { backgroundColor: Colors.dangerGlass },
  ageBadgeText: { fontSize: 10, fontWeight: '700' },
  ageTextFresh: { color: Colors.primaryLight },
  ageTextAging: { color: Colors.warning },
  ageTextCritical: { color: Colors.danger },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  actionBtnWhatsApp: { flex: 1.5 },
  actionBtnCollect: { backgroundColor: Colors.primary, flex: 1 },
  actionBtnText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
});
