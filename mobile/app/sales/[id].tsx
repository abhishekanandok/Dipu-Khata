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

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const {
    data: sale,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.getSaleById(id as string),
    enabled: !!id,
  });

  if (isLoading || !sale) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GlassHeader title="Invoice Details" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading invoice details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = sale.paymentStatus === 'PAID';
  const isPartial = sale.paymentStatus === 'PARTIAL';
  const isCancelled = sale.isCancelled;

  // Handlers
  const handleCall = () => {
    if (sale.customerMobile) {
      Linking.openURL(`tel:${sale.customerMobile}`);
    }
  };

  const handleWhatsAppShare = () => {
    const itemsLines = (sale.items || [])
      .map(
        (i: any) =>
          `• ${i.materialName}: ${i.quantity} ${i.unit} @ ₹${(i.rate / 100).toFixed(2)} = ₹${(i.lineTotal / 100).toFixed(2)}`
      )
      .join('\n');

    const msg = `*दीपु खाता एवं व्यापार (Dipu Khata & Trade)*\n` +
      `🧾 *बिल सं. (Invoice): #${sale.invoiceNumber}*\n` +
      `📅 दिनांक: ${new Date(sale.saleDate).toLocaleDateString('en-IN')}\n` +
      `👤 ग्राहक: ${sale.customerName} (${sale.customerMobile})\n\n` +
      `*सामान विवरण (Items):*\n${itemsLines}\n\n` +
      `कुल योग (Grand Total): ₹${(sale.grandTotal / 100).toFixed(2)}\n` +
      `जमा किया (Paid): ₹${(sale.amountPaid / 100).toFixed(2)}\n` +
      `*बकाया राशि (Balance Due): ₹${(sale.balanceDue / 100).toFixed(2)}*\n\n` +
      `धन्यवाद! 🙏`;

    const cleanMobile = sale.customerMobile?.replace(/\D/g, '') || '';
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please enter a cancellation reason.');
      return;
    }

    setCancelling(true);
    try {
      await api.cancelSale(id as string, cancelReason.trim());
      setShowCancelModal(false);
      await refetch();
      Alert.alert('Success', 'Invoice has been cancelled and customer ledger reversed.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to cancel invoice.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title={`Invoice #${sale.invoiceNumber}`}
        subtitle={
          new Date(sale.saleDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }) + ' • Retail Bill'
        }
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Cancellation Notice Banner */}
        {isCancelled && (
          <GlassCard variant="danger" style={styles.cancelledBanner}>
            <View style={styles.cancelledHeader}>
              <Ionicons name="close-circle" size={24} color={Colors.danger} />
              <Text style={styles.cancelledTitle}>Invoice Cancelled (रद्द किया गया)</Text>
            </View>
            <Text style={styles.cancelledReason}>
              Reason: {sale.cancelReason || 'Cancelled by admin'}
            </Text>
            {sale.cancelledAt && (
              <Text style={styles.cancelledDate}>
                On: {new Date(sale.cancelledAt).toLocaleString('en-IN')}
              </Text>
            )}
          </GlassCard>
        )}

        {/* Invoice Summary Header Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.invoiceTitle}>#{sale.invoiceNumber}</Text>
              <Text style={styles.invoiceSubtitle}>Retail Counter Bill</Text>
            </View>
            <StatusBadge
              status={
                isCancelled
                  ? 'CANCELLED'
                  : isPaid
                  ? 'COMPLETED'
                  : isPartial
                  ? 'PARTIAL'
                  : 'PENDING'
              }
              label={
                isCancelled
                  ? 'Cancelled (रद्द)'
                  : isPaid
                  ? 'Paid (नकद)'
                  : isPartial
                  ? 'Partial (आंशिक)'
                  : 'Unpaid (बाकी)'
              }
            />
          </View>
        </GlassCard>

        {/* Customer Information Card */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{sale.customerName}</Text>
              <Text style={styles.customerMobile}>{sale.customerMobile}</Text>
              {sale.customerId?.village && (
                <Text style={styles.customerVillage}>📍 {sale.customerId.village}</Text>
              )}
            </View>
            <View style={styles.customerActions}>
              <TouchableOpacity onPress={handleCall} style={styles.iconCircle}>
                <Ionicons name="call" size={18} color={Colors.primaryLight} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWhatsAppShare} style={styles.iconCircle}>
                <Ionicons name="logo-whatsapp" size={18} color={Colors.success} />
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Itemized Line Items */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Material Items ({sale.items?.length || 0})</Text>
          {(sale.items || []).map((item: any, idx: number) => (
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

        {/* Billing Calculations */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bill Breakdown</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcValue}>{formatCurrency(sale.subtotal)}</Text>
          </View>
          {sale.transportCharges > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Transport Charges (+)</Text>
              <Text style={styles.calcValue}>{formatCurrency(sale.transportCharges)}</Text>
            </View>
          )}
          {sale.discount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Discount (-)</Text>
              <Text style={[styles.calcValue, { color: Colors.success }]}>
                -{formatCurrency(sale.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.calcRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <AmountDisplay amount={sale.grandTotal} size="lg" />
          </View>

          <View style={[styles.calcRow, { marginTop: Spacing.sm }]}>
            <Text style={styles.calcLabel}>Amount Paid</Text>
            <AmountDisplay amount={sale.amountPaid} size="md" color={Colors.success} />
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Remaining Khata Due</Text>
            <AmountDisplay
              amount={sale.balanceDue}
              size="md"
              color={sale.balanceDue > 0 ? Colors.danger : Colors.textMuted}
            />
          </View>
        </GlassCard>

        {/* Payments Made */}
        {(sale.payments || []).length > 0 && (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payments Recorded</Text>
            {sale.payments.map((p: any, idx: number) => (
              <View key={idx} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentMethod}>
                    {p.method} Payment {p.referenceNumber ? `• ${p.referenceNumber}` : ''}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(p.date || sale.saleDate).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <AmountDisplay amount={p.amount} size="sm" color={Colors.success} />
              </View>
            ))}
          </GlassCard>
        )}

        {/* Notes */}
        {sale.notes && (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{sale.notes}</Text>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <GlassButton
            title="Share via WhatsApp"
            variant="primary"
            size="md"
            icon={<Ionicons name="logo-whatsapp" size={18} color="#FFF" />}
            onPress={handleWhatsAppShare}
            style={styles.actionBtn}
          />

          {!isCancelled && (
            <GlassButton
              title="Cancel Invoice (रद्द करें)"
              variant="danger"
              size="md"
              icon={<Ionicons name="close-circle-outline" size={18} color="#FFF" />}
              onPress={() => setShowCancelModal(true)}
              style={styles.actionBtn}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      {showCancelModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Invoice #{sale.invoiceNumber}</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Cancelling this invoice will reverse customer ledger debits and restore material stock.
            </Text>

            <GlassInput
              label="Cancellation Reason *"
              placeholder="e.g. Wrong items billed / customer returned"
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.modalActions}>
              <GlassButton
                title="Back"
                variant="secondary"
                size="md"
                onPress={() => setShowCancelModal(false)}
                style={{ flex: 1 }}
              />
              <GlassButton
                title="Confirm Cancel"
                variant="danger"
                size="md"
                loading={cancelling}
                onPress={handleCancelSale}
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
  cancelledBanner: { padding: Spacing.md, marginBottom: Spacing.md },
  cancelledHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cancelledTitle: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  cancelledReason: { color: Colors.textPrimary, fontSize: 13, marginTop: 4 },
  cancelledDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  invoiceSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  customerBox: { flexDirection: 'row', alignItems: 'center' },
  customerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  customerMobile: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  customerVillage: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  customerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  paymentMethod: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  paymentDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  notesText: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
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
  modalSubtitle: { color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
