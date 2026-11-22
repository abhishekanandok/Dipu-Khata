import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, AmountDisplay } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

type TabView = 'catalog' | 'movements';

export default function StockTabScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // 1. Fetch Overview Stats
  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['stockOverview'],
    queryFn: api.getStockOverview,
  });

  // 2. Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  // 3. Fetch Materials Catalog
  const {
    data: materialsData,
    isLoading: materialsLoading,
    refetch: refetchMaterials,
    isRefetching: materialsRefetching,
  } = useQuery({
    queryKey: ['materials', search, selectedCategory, lowStockOnly],
    queryFn: () => api.getMaterials(search, selectedCategory, lowStockOnly),
    enabled: activeTab === 'catalog',
  });

  // 4. Fetch Stock Movements
  const {
    data: movementsData,
    isLoading: movementsLoading,
    refetch: refetchMovements,
    isRefetching: movementsRefetching,
  } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => api.getStockMovements(),
    enabled: activeTab === 'movements',
  });

  const materials = materialsData?.data || [];
  const movements = movementsData?.data || [];
  const categoryTabs = ['All', ...categories.map((c: any) => c.name)];

  const onRefresh = async () => {
    await Promise.all([refetchOverview(), refetchMaterials(), refetchMovements()]);
  };

  const renderMaterialCard = ({ item }: { item: any }) => {
    const isLowStock = item.currentStock <= item.minimumStockAlert;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push(`/materials/${item._id}` as any)}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.nameContainer}>
              <Text style={styles.materialName}>{item.name}</Text>
              {item.hindiName && <Text style={styles.hindiName}>{item.hindiName}</Text>}
              <View style={styles.metaRow}>
                <StatusBadge label={item.categoryName} variant="info" />
                {item.brand && <Text style={styles.brandText}>• {item.brand}</Text>}
              </View>
            </View>

            <View style={styles.stockCol}>
              <View
                style={[
                  styles.stockBadge,
                  isLowStock ? styles.stockBadgeLow : styles.stockBadgeNormal,
                ]}
              >
                <Text
                  style={[
                    styles.stockQty,
                    isLowStock ? { color: Colors.danger } : { color: Colors.success },
                  ]}
                >
                  {item.currentStock} {item.defaultUnit}
                </Text>
              </View>
              <Text style={styles.stockStatusText}>
                {isLowStock ? 'Low Stock (कम)' : 'In Stock (उपलब्ध)'}
              </Text>
            </View>
          </View>

          <View style={styles.pricingRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Selling Rate (बिक्री दर):</Text>
              <Text style={styles.sellingRateText}>
                {formatCurrency(item.sellingRate)} / {item.defaultUnit}
              </Text>
            </View>

            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Purchase Rate (खरीद दर):</Text>
              <Text style={styles.purchaseRateText}>
                {formatCurrency(item.purchaseRate)} / {item.defaultUnit}
              </Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderMovementCard = ({ item }: { item: any }) => {
    const isAddition = [
      'OPENING_STOCK',
      'PURCHASE',
      'SALE_RETURN',
      'ADJUSTMENT_ADD',
    ].includes(item.movementType);

    const dateStr = new Date(item.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <GlassCard style={styles.movementCard}>
        <View style={styles.movementRow}>
          <View style={styles.movementIcon}>
            <Ionicons
              name={isAddition ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={isAddition ? Colors.success : Colors.danger}
            />
          </View>

          <View style={styles.movementDetails}>
            <Text style={styles.movementMatName}>{item.materialName}</Text>
            <Text style={styles.movementReason}>{item.reason || item.movementType}</Text>
            <Text style={styles.movementDate}>{dateStr}</Text>
          </View>

          <View style={styles.movementQtyCol}>
            <Text
              style={[
                styles.movementQty,
                isAddition ? { color: Colors.success } : { color: Colors.danger },
              ]}
            >
              {isAddition ? `+${item.quantity}` : `-${item.quantity}`} {item.unit}
            </Text>
            <Text style={styles.stockTransition}>
              {item.previousStock} → {item.newStock}
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Stock & Inventory"
        subtitle="स्टॉक, सामग्री एवं माल आवक"
      />

      <View style={styles.container}>
        {/* Quick Stock Summary Header */}
        <GlassCard variant="highlight" style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewCol}>
              <Text style={styles.overviewLabel}>Inventory Valuation (स्टॉक मूल्य)</Text>
              <AmountDisplay
                amountInPaise={overview?.totalValuation || 0}
                size="lg"
                color={Colors.textPrimary}
              />
            </View>
            <View style={styles.overviewColRight}>
              <Text style={styles.overviewLabel}>Low Stock Items</Text>
              <StatusBadge
                label={`${overview?.lowStockCount || 0} Items Alert`}
                variant={overview?.lowStockCount ? 'warning' : 'success'}
              />
            </View>
          </View>

          {/* Action Shortcuts: Inward Purchase & Adjustment */}
          <View style={styles.overviewActions}>
            <TouchableOpacity
              style={styles.actionShortcut}
              onPress={() => router.push('/purchases/add')}
            >
              <Ionicons name="cart" size={15} color={Colors.primaryLight} />
              <Text style={styles.actionShortcutText}>+ Inward Purchase (माल आवक)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionShortcut}
              onPress={() => router.push('/inventory/adjust')}
            >
              <Ionicons name="swap-vertical" size={15} color={Colors.warning} />
              <Text style={[styles.actionShortcutText, { color: Colors.warning }]}>
                Adjust Stock (सुधार)
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* View Segment: Catalog vs Movements */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'catalog' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('catalog')}
          >
            <Text style={[styles.segmentText, activeTab === 'catalog' && styles.segmentTextActive]}>
              Material Catalog (सामग्री सूची)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'movements' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('movements')}
          >
            <Text style={[styles.segmentText, activeTab === 'movements' && styles.segmentTextActive]}>
              Stock Movements (आवक-जावक)
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'catalog' ? (
          <>
            {/* Search Bar */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
              <TextInput
                placeholder="Search material, brand, or SKU..."
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

            {/* Category Filter Horizontal Scroll */}
            <View style={styles.filterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {categoryTabs.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, active && styles.catPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.catText, active && styles.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[styles.lowStockBtn, lowStockOnly && styles.lowStockBtnActive]}
                onPress={() => setLowStockOnly(!lowStockOnly)}
              >
                <Ionicons
                  name={lowStockOnly ? 'alert-circle' : 'alert-circle-outline'}
                  size={14}
                  color={lowStockOnly ? '#FFFFFF' : Colors.danger}
                />
                <Text style={[styles.lowStockText, lowStockOnly && styles.lowStockTextActive]}>
                  Low
                </Text>
              </TouchableOpacity>
            </View>

            {/* Materials List */}
            <FlatList
              data={materials}
              keyExtractor={(item) => item._id}
              renderItem={renderMaterialCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={materialsRefetching}
                  onRefresh={onRefresh}
                  tintColor={Colors.primaryLight}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No materials found</Text>
                  <Text style={styles.emptySubtitle}>
                    Add construction materials to track rates and stock.
                  </Text>
                </View>
              }
            />
          </>
        ) : (
          /* Stock Movements History */
          <FlatList
            data={movements}
            keyExtractor={(item) => item._id}
            renderItem={renderMovementCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={movementsRefetching}
                onRefresh={onRefresh}
                tintColor={Colors.primaryLight}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="swap-vertical-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No stock movements yet</Text>
                <Text style={styles.emptySubtitle}>
                  Stock changes from inward purchases, dispatches, and adjustments appear here.
                </Text>
              </View>
            }
          />
        )}

        {/* Floating Add Material FAB */}
        {activeTab === 'catalog' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/materials/add')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Add Material</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  overviewCard: {
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewCol: { flex: 1 },
  overviewColRight: { alignItems: 'flex-end' },
  overviewLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  overviewActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  actionShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  actionShortcutText: { color: Colors.primaryLight, fontSize: 12, fontWeight: '600' },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.md,
    padding: 3,
    marginVertical: Spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 9,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 6,
  },
  categoryScroll: {
    gap: 6,
    paddingRight: 6,
  },
  catPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  catPillActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primaryLight,
  },
  catText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  catTextActive: { color: '#FFFFFF', fontWeight: '700' },
  lowStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerGlass,
    gap: 4,
  },
  lowStockBtnActive: { backgroundColor: Colors.danger },
  lowStockText: { color: Colors.danger, fontSize: 11, fontWeight: '600' },
  lowStockTextActive: { color: '#FFFFFF' },
  listContent: { paddingBottom: 110 },
  card: { marginBottom: 10, padding: 12 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: { flex: 1, marginRight: 8 },
  materialName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  hindiName: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  brandText: { color: Colors.textMuted, fontSize: 11 },
  stockCol: { alignItems: 'flex-end' },
  stockBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  stockBadgeNormal: { backgroundColor: Colors.successGlass, borderColor: Colors.success },
  stockBadgeLow: { backgroundColor: Colors.dangerGlass, borderColor: Colors.danger },
  stockQty: { fontSize: 12, fontWeight: '700' },
  stockStatusText: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  priceItem: { flex: 1 },
  priceLabel: { color: Colors.textMuted, fontSize: 10 },
  sellingRateText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 1 },
  purchaseRateText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 1 },
  movementCard: { marginBottom: 8, padding: 12 },
  movementRow: { flexDirection: 'row', alignItems: 'center' },
  movementIcon: { marginRight: 10 },
  movementDetails: { flex: 1 },
  movementMatName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  movementReason: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  movementDate: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  movementQtyCol: { alignItems: 'flex-end' },
  movementQty: { fontSize: 14, fontWeight: '700' },
  stockTransition: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
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
    gap: 6,
  },
  fabText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
