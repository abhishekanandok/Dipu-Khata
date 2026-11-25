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
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';

type EstimateStatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'CONVERTED';

export default function EstimatesIndexScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatusFilter>('ALL');

  const {
    data: estimatesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['estimates', search, statusFilter],
    queryFn: () =>
      api.getEstimates({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const estimatesList = estimatesData?.data || [];

  const renderEstimateItem = ({ item }: { item: any }) => {
    const isConverted = item.status === 'CONVERTED';
    const itemsCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/estimates/${item._id}`)}
      >
        <GlassCard style={styles.estimateCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.estimateNumber}>#{item.estimateNumber}</Text>
              <Text style={styles.dateText}>
                {new Date(item.estimateDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <StatusBadge
              status={isConverted ? 'COMPLETED' : 'PENDING'}
              label={isConverted ? 'Converted (बिल बना)' : item.status}
            />
          </View>

          <View style={styles.customerRow}>
            <Ionicons name="person-circle-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.customerMobile}>• {item.customerMobile}</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.itemsCountText}>{itemsCount} Materials Quoted</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalLabel}>Estimate Total</Text>
              <AmountDisplay amount={item.grandTotal} size="md" />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Quotations & Estimates"
        subtitle="अनुमान एवं कोटेशन • Price Estimates"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Quick Add Estimate Button */}
        <GlassButton
          title="+ Create New Estimate (नया कोटेशन)"
          variant="primary"
          size="md"
          icon={<Ionicons name="document-text-outline" size={18} color="#FFF" />}
          onPress={() => router.push('/estimates/new')}
          style={styles.newBtn}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search estimate #, customer or mobile..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Status Filters */}
        <View style={styles.filterRow}>
          {(['ALL', 'DRAFT', 'SENT', 'CONVERTED'] as EstimateStatusFilter[]).map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st === 'ALL' ? 'All' : st === 'CONVERTED' ? 'Converted' : st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Estimates List */}
        <FlatList
          data={estimatesList}
          keyExtractor={(item) => item._id}
          renderItem={renderEstimateItem}
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
                <Ionicons name="document-text-outline" size={48} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Quotations Found</Text>
                <Text style={styles.emptySubtitle}>
                  Create quotations for prospective builders and contractors.
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
  estimateCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateNumber: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  dateText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  customerName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  customerMobile: { color: Colors.textSecondary, fontSize: 12 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  itemsCountText: { color: Colors.textMuted, fontSize: 12 },
  totalLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
