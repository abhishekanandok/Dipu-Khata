import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';

type CustomerFilter = 'all' | 'with_dues' | 'zero_balance' | 'advance';

export default function KhataTabScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['customers', search, filter],
    queryFn: () => api.getCustomers(search, filter),
  });

  const customers = data?.data || [];
  const summary = data?.meta || {};

  const filterOptions: Array<{ id: CustomerFilter; label: string; hindi: string }> = [
    { id: 'all', label: 'All', hindi: 'सभी' },
    { id: 'with_dues', label: 'With Dues', hindi: 'उधारी' },
    { id: 'advance', label: 'Advance', hindi: 'जमा' },
    { id: 'zero_balance', label: 'Settled', hindi: 'शून्य' },
  ];

  const handleCall = (mobile: string) => {
    Linking.openURL(`tel:${mobile}`).catch(() => {});
  };

  const renderCustomerItem = ({ item }: { item: any }) => {
    const isDue = item.currentBalance > 0;
    const isAdvance = item.currentBalance < 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/customers/${item._id}` as any)}
      >
        <GlassCard style={styles.customerCard}>
          <View style={styles.customerRow}>
            {/* Avatar */}
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: isDue
                    ? Colors.dangerGlass
                    : isAdvance
                    ? Colors.successGlass
                    : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: isDue ? Colors.danger : isAdvance ? Colors.success : Colors.textSecondary },
                ]}
              >
                {item.name ? item.name.charAt(0).toUpperCase() : 'C'}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.infoCol}>
              <Text style={styles.customerName}>{item.name}</Text>
              <View style={styles.metaRow}>
                {item.village && (
                  <Text style={styles.villageText}>
                    📍 {item.village}
                  </Text>
                )}
                <Text style={styles.mobileText}>{item.mobile}</Text>
              </View>
            </View>

            {/* Balance & Actions */}
            <View style={styles.balanceCol}>
              <AmountDisplay
                amountInPaise={item.currentBalance}
                size="md"
                color={isDue ? Colors.danger : isAdvance ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.balanceLabel}>
                {isDue ? 'Lena Hai (बाकी)' : isAdvance ? 'Dena Hai (जमा)' : 'Settled (बराबर)'}
              </Text>
            </View>

            {/* Quick Call Button */}
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(item.mobile)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="call" size={16} color={Colors.primaryLight} />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Customer Khata"
        subtitle="ग्राहक खाता बही • Digital Ledger"
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search name, mobile, or village..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Scroll Pills */}
        <View style={styles.filterBar}>
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
        </View>

        {/* Customer List */}
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={Colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No customers found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try another search term' : 'Add your first customer to begin recording transactions.'}
              </Text>
            </View>
          }
        />

        {/* Floating Add Customer Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/customers/add')}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.fabText}>Add Customer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    fontSize: 10,
    opacity: 0.8,
  },
  listContent: {
    paddingBottom: 110,
  },
  customerCard: {
    marginBottom: 10,
    padding: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
  },
  customerName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  villageText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  mobileText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  balanceCol: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  balanceLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  callBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
