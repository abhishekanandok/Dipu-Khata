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
import { formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

export default function StockTabScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  // Fetch Materials
  const {
    data: materialsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['materials', search, selectedCategory, lowStockOnly],
    queryFn: () => api.getMaterials(search, selectedCategory, lowStockOnly),
  });

  const materials = materialsData?.data || [];

  const categoryTabs = ['All', ...categories.map((c: any) => c.name)];

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
              {item.hindiName && (
                <Text style={styles.hindiName}>{item.hindiName}</Text>
              )}
              <View style={styles.metaRow}>
                <StatusBadge label={item.categoryName} variant="info" />
                {item.brand && (
                  <Text style={styles.brandText}>• Brand: {item.brand}</Text>
                )}
              </View>
            </View>

            {/* Stock Quantity Pill */}
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
                {isLowStock ? 'Low Stock (कम स्टॉक)' : 'In Stock (उपलब्ध)'}
              </Text>
            </View>
          </View>

          {/* Pricing Row */}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Material Catalog"
        subtitle="सामग्री एवं दर सूची • Price Master"
      />

      <View style={styles.container}>
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

          {/* Low Stock Toggle */}
          <TouchableOpacity
            style={[styles.lowStockBtn, lowStockOnly && styles.lowStockBtnActive]}
            onPress={() => setLowStockOnly(!lowStockOnly)}
          >
            <Ionicons
              name={lowStockOnly ? 'alert-circle' : 'alert-circle-outline'}
              size={16}
              color={lowStockOnly ? '#FFFFFF' : Colors.danger}
            />
            <Text style={[styles.lowStockText, lowStockOnly && styles.lowStockTextActive]}>
              Low Stock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Material List */}
        <FlatList
          data={materials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterialCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No materials found</Text>
              <Text style={styles.emptySubtitle}>
                Add your construction materials to track rates and stock.
              </Text>
            </View>
          }
        />

        {/* Floating Add Material FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/materials/add')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>Add Material</Text>
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
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 8,
  },
  categoryScroll: {
    gap: 6,
    paddingRight: 8,
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  catPillActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primaryLight,
  },
  catText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  catTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lowStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerGlass,
    gap: 4,
  },
  lowStockBtnActive: {
    backgroundColor: Colors.danger,
  },
  lowStockText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  lowStockTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 110,
  },
  card: {
    marginBottom: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  materialName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  hindiName: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  brandText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  stockBadgeNormal: {
    backgroundColor: Colors.successGlass,
    borderColor: Colors.success,
  },
  stockBadgeLow: {
    backgroundColor: Colors.dangerGlass,
    borderColor: Colors.danger,
  },
  stockQty: {
    fontSize: 13,
    fontWeight: '700',
  },
  stockStatusText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  sellingRateText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  purchaseRateText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
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
    gap: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
