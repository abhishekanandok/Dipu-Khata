import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

export default function MaterialDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [modalVisible, setModalVisible] = useState(false);
  const [newSellingRate, setNewSellingRate] = useState('');
  const [newPurchaseRate, setNewPurchaseRate] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // 1. Fetch Material Profile
  const {
    data: material,
    isLoading: materialLoading,
    refetch: refetchMaterial,
  } = useQuery({
    queryKey: ['materialDetail', id],
    queryFn: () => api.getMaterialById(id!),
    enabled: !!id,
  });

  // 2. Fetch Price History
  const {
    data: priceHistory = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
    isRefetching,
  } = useQuery({
    queryKey: ['materialPriceHistory', id],
    queryFn: () => api.getPriceHistory(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    await Promise.all([refetchMaterial(), refetchHistory()]);
  };

  const openUpdateModal = () => {
    if (material) {
      setNewSellingRate((material.sellingRate / 100).toString());
      setNewPurchaseRate((material.purchaseRate / 100).toString());
      setReason('');
      setUpdateError(null);
      setModalVisible(true);
    }
  };

  const handleUpdatePrice = async () => {
    const sell = parseFloat(newSellingRate) || 0;
    const buy = parseFloat(newPurchaseRate) || 0;

    if (sell <= 0 || buy <= 0) {
      setUpdateError('Rates must be greater than zero');
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    try {
      await api.updateMaterial(id!, {
        sellingRate: Math.round(sell * 100),
        purchaseRate: Math.round(buy * 100),
        priceChangeReason: reason.trim() || 'Manual Rate Adjustment',
      });

      setModalVisible(false);
      await onRefresh();
    } catch (err: any) {
      setUpdateError(err.response?.data?.error?.message || 'Failed to update rates');
    } finally {
      setUpdating(false);
    }
  };

  if (materialLoading || historyLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GlassHeader title="Material Detail" subtitle="Loading..." />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  const isLowStock = (material?.currentStock || 0) <= (material?.minimumStockAlert || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title={material?.name || 'Material Detail'}
        subtitle={`${material?.categoryName} • ${material?.defaultUnit}`}
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
        {/* Profile Card */}
        <GlassCard variant="highlight" style={styles.profileCard}>
          <View style={styles.topRow}>
            <View style={styles.nameCol}>
              <Text style={styles.titleText}>{material?.name}</Text>
              {material?.hindiName && (
                <Text style={styles.hindiSubtitle}>{material?.hindiName}</Text>
              )}
              <View style={styles.badgesRow}>
                <StatusBadge label={material?.categoryName} variant="info" />
                {material?.brand && (
                  <StatusBadge label={`Brand: ${material.brand}`} variant="neutral" />
                )}
                {material?.sku && (
                  <StatusBadge label={`SKU: ${material.sku}`} variant="neutral" />
                )}
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Rates & Stock Overview */}
        <View style={styles.gridRow}>
          {/* Selling Rate Card */}
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Selling Rate (बिक्री दर)</Text>
            <Text style={styles.sellingRateValue}>
              {formatCurrency(material?.sellingRate || 0)}
            </Text>
            <Text style={styles.metricUnit}>per {material?.defaultUnit}</Text>
          </GlassCard>

          {/* Purchase Rate Card */}
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Purchase Rate (खरीद दर)</Text>
            <Text style={styles.purchaseRateValue}>
              {formatCurrency(material?.purchaseRate || 0)}
            </Text>
            <Text style={styles.metricUnit}>per {material?.defaultUnit}</Text>
          </GlassCard>
        </View>

        {/* Stock Level Card */}
        <GlassCard style={styles.stockCard}>
          <View style={styles.stockRow}>
            <View>
              <Text style={styles.metricLabel}>Current Stock (मौजूदा स्टॉक)</Text>
              <Text style={styles.stockNumber}>
                {material?.currentStock} {material?.defaultUnit}
              </Text>
              <Text style={styles.minAlertText}>
                Minimum threshold: {material?.minimumStockAlert} {material?.defaultUnit}
              </Text>
            </View>

            <StatusBadge
              label={isLowStock ? 'LOW STOCK (कम)' : 'IN STOCK (पर्याप्त)'}
              variant={isLowStock ? 'danger' : 'success'}
            />
          </View>
        </GlassCard>

        {/* Update Price Action Button */}
        <GlassButton
          title="Update Rates (दर संशोधित करें)"
          variant="primary"
          size="lg"
          onPress={openUpdateModal}
          style={styles.updatePriceBtn}
        />

        {/* Historical Price Audit Timeline */}
        <Text style={styles.sectionHeading}>Price Change History (दर संशोधन इतिहास)</Text>
        <GlassCard style={styles.historyCard}>
          {priceHistory.length > 0 ? (
            priceHistory.map((item: any, idx: number) => {
              const dateStr = new Date(item.effectiveDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              const sellDelta = item.newSellingRate - item.oldSellingRate;

              return (
                <View
                  key={item._id}
                  style={[styles.historyRow, idx > 0 && styles.historyDivider]}
                >
                  <View style={styles.historyDateCol}>
                    <Text style={styles.historyDateText}>{dateStr}</Text>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  </View>

                  <View style={styles.historyDescCol}>
                    <Text style={styles.historyReason}>
                      {item.reason || 'Price adjustment'}
                    </Text>
                    <Text style={styles.historyRateFlow}>
                      Sell: {formatCurrency(item.oldSellingRate)} → {formatCurrency(item.newSellingRate)}
                    </Text>
                    <Text style={styles.historyBuyRate}>
                      Buy: {formatCurrency(item.oldPurchaseRate)} → {formatCurrency(item.newPurchaseRate)}
                    </Text>
                  </View>

                  <View style={styles.historyDeltaCol}>
                    <Text
                      style={[
                        styles.deltaText,
                        sellDelta >= 0 ? { color: Colors.danger } : { color: Colors.success },
                      ]}
                    >
                      {sellDelta >= 0 ? `+${formatCurrency(sellDelta)}` : formatCurrency(sellDelta)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryText}>No price modifications recorded</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>

      {/* Update Rate Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard variant="highlight" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Material Rates</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {updateError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{updateError}</Text>
              </View>
            )}

            <GlassInput
              label={`New Selling Rate (₹ / ${material?.defaultUnit})`}
              placeholder="0.00"
              keyboardType="numeric"
              prefix="₹"
              value={newSellingRate}
              onChangeText={setNewSellingRate}
            />

            <GlassInput
              label={`New Purchase Rate (₹ / ${material?.defaultUnit})`}
              placeholder="0.00"
              keyboardType="numeric"
              prefix="₹"
              value={newPurchaseRate}
              onChangeText={setNewPurchaseRate}
            />

            <GlassInput
              label="Reason for Rate Revision (संशोधन का कारण)"
              placeholder="e.g. Factory price increase, transport cost hike"
              value={reason}
              onChangeText={setReason}
            />

            <GlassButton
              title="Save & Record in History"
              variant="primary"
              size="lg"
              loading={updating}
              onPress={handleUpdatePrice}
              style={{ marginTop: Spacing.sm }}
            />
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  nameCol: { flex: 1 },
  titleText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  hindiSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  gridRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  metricCard: { flex: 1, padding: 14 },
  metricLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  sellingRateValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  purchaseRateValue: { color: Colors.textSecondary, fontSize: 18, fontWeight: '700' },
  metricUnit: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  stockCard: { padding: 14, marginBottom: Spacing.md },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockNumber: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  minAlertText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  updatePriceBtn: { marginBottom: Spacing.lg },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  historyCard: { padding: 0, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  historyDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  historyDateCol: { width: 90 },
  historyDateText: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  historyDescCol: { flex: 1, paddingHorizontal: 8 },
  historyReason: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  historyRateFlow: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  historyBuyRate: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  historyDeltaCol: { alignItems: 'flex-end', minWidth: 60 },
  deltaText: { fontSize: 13, fontWeight: '700' },
  emptyHistory: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  emptyHistoryText: { color: Colors.textMuted, fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: { padding: Spacing.xl },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerGlass,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.md,
    padding: 8,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  modalErrorText: { color: Colors.danger, fontSize: 12, flex: 1 },
});
