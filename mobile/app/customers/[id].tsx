import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';
import { PrintService } from '../../services/printService';

export default function CustomerKhataScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // 1. Fetch Customer Summary & Profile
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['customerSummary', id],
    queryFn: () => api.getCustomerSummary(id!),
    enabled: !!id,
  });

  // 2. Fetch Customer Chronological Ledger
  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
    isRefetching,
  } = useQuery({
    queryKey: ['customerLedger', id],
    queryFn: () => api.getCustomerLedger(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    await Promise.all([refetchSummary(), refetchLedger()]);
  };

  const customer = summaryData?.customer;
  const financials = summaryData?.financials;
  const entries = ledgerData?.data || [];

  const handleCall = () => {
    if (customer?.mobile) {
      Linking.openURL(`tel:${customer.mobile}`).catch(() => {});
    }
  };

  const handleShareStatement = async () => {
    if (!customer) return;
    const balanceText = formatCurrency(customer.currentBalance);
    const statusText = customer.currentBalance > 0 ? 'बाकी (Due)' : 'जमा (Advance)';

    const message = `*गिट्टी बालू डिपो (GittiBalu Depo)*\n\n` +
      `ग्राहक: ${customer.name}\n` +
      `मोबाइल: ${customer.mobile}\n` +
      `तारीख: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `कुल बकाया राशि: ${balanceText} [${statusText}]\n\n` +
      `कृपया समय पर भुगतान करें। धन्यवाद!`;

    try {
      await Share.share({ message });
    } catch {}
  };

  if (summaryLoading || ledgerLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GlassHeader title="Customer Khata" subtitle="Loading..." />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  const isDue = (customer?.currentBalance || 0) > 0;
  const isAdvance = (customer?.currentBalance || 0) < 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title={customer?.name || 'Customer Khata'}
        subtitle={`📍 ${customer?.village || 'General'} • ${customer?.mobile || ''}`}
        rightAction={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Customer Quick Info & Contact Header */}
        <GlassCard variant="highlight" style={styles.profileCard}>
          <View style={styles.topRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customer?.name?.charAt(0) || 'C'}</Text>
            </View>
            <View style={styles.nameCol}>
              <Text style={styles.customerName}>{customer?.name}</Text>
              <Text style={styles.addressText}>
                {customer?.address || customer?.village || 'No address specified'}
              </Text>
            </View>
            <StatusBadge
              label={isDue ? 'DUE (बाकी)' : isAdvance ? 'ADVANCE (जमा)' : 'SETTLED (बराबर)'}
              variant={isDue ? 'danger' : isAdvance ? 'success' : 'neutral'}
            />
          </View>

          {/* Quick Contact & Statement Bar */}
          <View style={styles.contactBar}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
              <Ionicons name="call" size={16} color={Colors.primaryLight} />
              <Text style={styles.contactBtnText}>Call ({customer?.mobile})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleShareStatement}>
              <Ionicons name="logo-whatsapp" size={16} color={Colors.success} />
              <Text style={[styles.contactBtnText, { color: Colors.success }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => PrintService.printStatement(id!, 'share')}
            >
              <Ionicons name="document-text-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.contactBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Financial Summary Cards */}
        <View style={styles.gridRow}>
          {/* Net Balance Card */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Balance (कुल बाकी)</Text>
            <AmountDisplay
              amountInPaise={customer?.currentBalance || 0}
              size="lg"
              color={isDue ? Colors.danger : isAdvance ? Colors.success : Colors.textPrimary}
            />
            <Text style={styles.summarySub}>
              {isDue ? 'Customer owes store' : isAdvance ? 'Advance deposit' : 'Zero balance'}
            </Text>
          </GlassCard>

          {/* Total Billed Card */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Sales (कुल बिक्री)</Text>
            <AmountDisplay
              amountInPaise={financials?.totalSales || 0}
              size="lg"
              color={Colors.textPrimary}
            />
            <Text style={styles.summarySub}>Total goods billed</Text>
          </GlassCard>
        </View>

        <View style={styles.gridRow}>
          {/* Total Payments Card */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Payments (प्राप्त राशि)</Text>
            <AmountDisplay
              amountInPaise={financials?.totalPaymentsReceived || 0}
              size="lg"
              color={Colors.success}
            />
            <Text style={styles.summarySub}>Total money collected</Text>
          </GlassCard>

          {/* Opening Balance Card */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Opening (आरंभिक)</Text>
            <AmountDisplay
              amountInPaise={customer?.openingBalance || 0}
              size="lg"
              color={customer?.openingBalanceType === 'RECEIVABLE' ? Colors.danger : Colors.success}
            />
            <Text style={styles.summarySub}>
              {customer?.openingBalanceType === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
            </Text>
          </GlassCard>
        </View>

        {/* Action Buttons: New Bill, Payment, Adjustment */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/(tabs)/sales')}
          >
            <Ionicons name="cart" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>+ New Bill (बिक्री)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.success }]}
            onPress={() =>
              router.push({
                pathname: '/customers/adjustment',
                params: { id: customer?.id || id, type: 'CREDIT', name: customer?.name },
              })
            }
          >
            <Ionicons name="cash" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>+ Payment (जमा)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}
            onPress={() =>
              router.push({
                pathname: '/customers/adjustment',
                params: { id: customer?.id || id, name: customer?.name },
              })
            }
          >
            <Ionicons name="swap-vertical" size={18} color={Colors.textPrimary} />
            <Text style={styles.actionBtnText}>Adjustment</Text>
          </TouchableOpacity>
        </View>

        {/* Immutable Khata Ledger History */}
        <Text style={styles.sectionHeading}>Khata Ledger History (खाता विवरण)</Text>
        <GlassCard style={styles.ledgerCard}>
          {entries.length > 0 ? (
            entries.map((entry: any, index: number) => {
              const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <View
                  key={entry._id}
                  style={[styles.entryRow, index > 0 && styles.entryDivider]}
                >
                  {/* Left: Date & Type */}
                  <View style={styles.entryDateCol}>
                    <Text style={styles.entryDateText}>{dateStr}</Text>
                    <StatusBadge
                      label={entry.entryType.replace('_', ' ')}
                      variant={
                        entry.debit > 0
                          ? 'danger'
                          : entry.credit > 0
                          ? 'success'
                          : 'neutral'
                      }
                    />
                  </View>

                  {/* Middle: Description */}
                  <View style={styles.entryDescCol}>
                    <Text style={styles.entryDescText}>{entry.description}</Text>
                    {entry.referenceId && (
                      <Text style={styles.entryRefText}>Ref: {entry.referenceId}</Text>
                    )}
                  </View>

                  {/* Right: Debit, Credit & Running Balance */}
                  <View style={styles.entryAmountsCol}>
                    {entry.debit > 0 ? (
                      <Text style={styles.debitAmount}>
                        +{formatCurrency(entry.debit)}
                      </Text>
                    ) : (
                      <Text style={styles.creditAmount}>
                        -{formatCurrency(entry.credit)}
                      </Text>
                    )}
                    <Text style={styles.runningBalanceText}>
                      Bal: {formatCurrency(entry.runningBalance)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyLedger}>
              <Ionicons name="book-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyLedgerText}>No ledger entries recorded yet</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  nameCol: { flex: 1 },
  customerName: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  addressText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  contactBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  contactBtnText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
  gridRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { flex: 1, padding: 12 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  summarySub: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  actionsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  ledgerCard: { padding: 0, overflow: 'hidden' },
  entryRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  entryDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  entryDateCol: { width: 95 },
  entryDateText: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4 },
  entryDescCol: { flex: 1, paddingHorizontal: 8 },
  entryDescText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  entryRefText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  entryAmountsCol: { alignItems: 'flex-end', minWidth: 90 },
  debitAmount: { color: Colors.danger, fontSize: 14, fontWeight: '700' },
  creditAmount: { color: Colors.success, fontSize: 14, fontWeight: '700' },
  runningBalanceText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyLedger: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyLedgerText: { color: Colors.textMuted, fontSize: 13 },
});
