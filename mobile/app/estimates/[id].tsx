import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Convert Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [cashPaidRupees, setCashPaidRupees] = useState('0');
  const [upiPaidRupees, setUpiPaidRupees] = useState('0');
  const [converting, setConverting] = useState(false);

  const {
    data: estimate,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => api.getEstimateById(id as string),
    enabled: !!id,
  });

  if (isLoading || !estimate) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GlassHeader title="Quotation Details" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading quotation details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isConverted = estimate.status === 'CONVERTED';

  const handleWhatsAppShare = () => {
    const itemsLines = (estimate.items || [])
      .map(
        (i: any) =>
          `• ${i.materialName}: ${i.quantity} ${i.unit} @ ₹${(i.rate / 100).toFixed(2)} = ₹${(i.lineTotal / 100).toFixed(2)}`
      )
      .join('\n');

    const msg = `*दीपु खाता एवं व्यापार (Dipu Khata & Trade)*\n` +
      `📋 *अनुमान / कोटेशन (Estimate): #${estimate.estimateNumber}*\n` +
      `📅 दिनांक: ${new Date(estimate.estimateDate).toLocaleDateString('en-IN')}\n` +
      `👤 ग्राहक: ${estimate.customerName} (${estimate.customerMobile})\n\n` +
      `*सामान विवरण (Items Quoted):*\n${itemsLines}\n\n` +
      `*कुल अनुमानित राशि (Total Amount): ₹${(estimate.grandTotal / 100).toFixed(2)}*\n\n` +
      `दरें 7 दिनों के लिए मान्य हैं। 🙏`;

    const cleanMobile = estimate.customerMobile?.replace(/\D/g, '') || '';
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const payments = [];
      const cash = parseFloat(cashPaidRupees) || 0;
      const upi = parseFloat(upiPaidRupees) || 0;
      if (cash > 0) payments.push({ amount: Math.round(cash * 100), method: 'CASH' });
      if (upi > 0) payments.push({ amount: Math.round(upi * 100), method: 'UPI' });

      const res = await api.convertEstimate(id as string, {
        payments,
        autoStockDeduction: true,
      });

      setShowConvertModal(false);
      await refetch();
      router.replace(`/sales/${res.sale._id}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to convert estimate to bill.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title={`Quotation #${estimate.estimateNumber}`}
        subtitle="Price Estimate & Quote"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Status Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.estimateTitle}>#{estimate.estimateNumber}</Text>
              <Text style={styles.estimateDate}>
                {new Date(estimate.estimateDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <StatusBadge
              status={isConverted ? 'COMPLETED' : 'PENDING'}
              label={isConverted ? 'Converted to Bill' : estimate.status}
            />
          </View>
        </GlassCard>

        {/* Customer Card */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.customerName}>{estimate.customerName}</Text>
          <Text style={styles.customerMobile}>{estimate.customerMobile}</Text>
          {estimate.village && <Text style={styles.customerVillage}>📍 {estimate.village}</Text>}
        </GlassCard>

        {/* Itemized Table */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quoted Materials ({estimate.items?.length || 0})</Text>
          {(estimate.items || []).map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.materialName}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit} × {formatCurrency(item.rate)}
                </Text>
              </View>
              <Text style={styles.itemLineTotal}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Financials */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Estimate Breakdown</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcValue}>{formatCurrency(estimate.subtotal)}</Text>
          </View>
          {estimate.transportCharges > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Transport (+)</Text>
              <Text style={styles.calcValue}>{formatCurrency(estimate.transportCharges)}</Text>
            </View>
          )}
          {estimate.discount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Discount (-)</Text>
              <Text style={[styles.calcValue, { color: Colors.success }]}>
                -{formatCurrency(estimate.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.calcRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Estimated Total</Text>
            <AmountDisplay amount={estimate.grandTotal} size="lg" />
          </View>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isConverted ? (
            <GlassButton
              title="Convert to Bill (बिल बनाएं)"
              variant="primary"
              size="lg"
              icon={<Ionicons name="receipt-outline" size={20} color="#FFF" />}
              onPress={() => setShowConvertModal(true)}
              style={styles.actionBtn}
            />
          ) : (
            <GlassButton
              title="View Generated Bill"
              variant="secondary"
              size="md"
              onPress={() => router.push(`/sales/${estimate.convertedSaleId}`)}
              style={styles.actionBtn}
            />
          )}

          <GlassButton
            title="Share via WhatsApp"
            variant="secondary"
            size="md"
            icon={<Ionicons name="logo-whatsapp" size={18} color={Colors.success} />}
            onPress={handleWhatsAppShare}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Convert to Bill Modal */}
      {showConvertModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Convert to Active Bill</Text>
              <TouchableOpacity onPress={() => setShowConvertModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Total Bill: {formatCurrency(estimate.grandTotal)}
            </Text>

            <GlassInput
              label="Cash Paid (₹)"
              placeholder="0"
              value={cashPaidRupees}
              onChangeText={setCashPaidRupees}
              keyboardType="decimal-pad"
            />
            <GlassInput
              label="UPI Paid (₹)"
              placeholder="0"
              value={upiPaidRupees}
              onChangeText={setUpiPaidRupees}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <GlassButton
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setShowConvertModal(false)}
                style={{ flex: 1 }}
              />
              <GlassButton
                title="Confirm & Bill"
                variant="primary"
                size="md"
                loading={converting}
                onPress={handleConvert}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: 14 },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  estimateDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  customerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  customerMobile: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  customerVillage: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  itemName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  itemMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  itemLineTotal: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcLabel: { color: Colors.textSecondary, fontSize: 13 },
  calcValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  grandTotalLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  actionsContainer: { gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { width: '100%' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: { width: '100%', padding: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  modalSubtitle: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
