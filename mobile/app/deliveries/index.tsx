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
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';

type DeliveryStatusFilter = 'ALL' | 'DISPATCHED' | 'DELIVERED';

export default function DeliveriesIndexScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('ALL');

  const {
    data: deliveriesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['deliveries', search, statusFilter],
    queryFn: () =>
      api.getDeliveries({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const deliveriesList = deliveriesData?.data || [];

  const renderDeliveryItem = ({ item }: { item: any }) => {
    const isDelivered = item.status === 'DELIVERED';
    const itemsSummary = (item.items || [])
      .map((i: any) => `${i.materialName} (${i.quantity} ${i.unit})`)
      .join(', ');

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/deliveries/${item._id}`)}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.challanNumber}>#{item.challanNumber}</Text>
              <Text style={styles.invoiceMeta}>Invoice #{item.invoiceNumber}</Text>
            </View>
            <StatusBadge
              status={isDelivered ? 'COMPLETED' : 'WARNING'}
              label={isDelivered ? 'Delivered (पहुंचा)' : 'In Transit (रास्ते में)'}
            />
          </View>

          <View style={styles.custRow}>
            <Ionicons name="location-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.custText}>
              {item.customerName} • {item.deliveryAddress}
            </Text>
          </View>

          <View style={styles.vehicleRow}>
            <Ionicons name="car-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.vehicleText}>
              {item.vehicleNumber || 'Store Vehicle'}{' '}
              {item.driverName ? `(Driver: ${item.driverName})` : ''}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.itemsText} numberOfLines={1}>
              📦 {itemsSummary}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.dispatchDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Delivery Challans"
        subtitle="सामान डिलीवरी चालान • Fleet & Multi-Trip Dispatches"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        <GlassButton
          title="+ New Delivery Challan (नया चालान)"
          variant="primary"
          size="md"
          icon={<Ionicons name="newspaper-outline" size={18} color="#FFF" />}
          onPress={() => router.push('/deliveries/new')}
          style={styles.newBtn}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search challan #, customer, driver, vehicle..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(['ALL', 'DISPATCHED', 'DELIVERED'] as DeliveryStatusFilter[]).map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st === 'ALL' ? 'All Challans' : st === 'DISPATCHED' ? 'In Transit' : 'Delivered'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={deliveriesList}
          keyExtractor={(item) => item._id}
          renderItem={renderDeliveryItem}
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
                <Ionicons name="newspaper-outline" size={48} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Delivery Challans Found</Text>
                <Text style={styles.emptySubtitle}>
                  Issue delivery challans when materials leave the warehouse or yard.
                </Text>
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
  newBtn: { marginVertical: Spacing.sm },
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
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challanNumber: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  invoiceMeta: { color: Colors.primaryLight, fontSize: 11, marginTop: 2 },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  custText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  vehicleText: { color: Colors.textSecondary, fontSize: 12 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  itemsText: { color: Colors.textMuted, fontSize: 12, flex: 1, marginRight: Spacing.sm },
  dateText: { color: Colors.textMuted, fontSize: 11 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
