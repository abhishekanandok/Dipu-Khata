import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { AmountDisplay, formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';
import { PrintService } from '../../services/printService';

type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export default function ReceivePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string }>();

  const [selectedCustomerId, setSelectedCustomerId] = useState(params.customerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedPayment, setRecordedPayment] = useState<any>(null);

  // Queries
  const { data: customersData } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => api.getCustomers(customerSearch, 'all', 1, 50),
  });
  const customers = customersData?.data || [];

  const selectedCustomer = customers.find((c: any) => c._id === selectedCustomerId);

  const handleSettleFullDue = () => {
    if (selectedCustomer && selectedCustomer.currentBalance > 0) {
      setAmountRupees((selectedCustomer.currentBalance / 100).toString());
    }
  };

  const handleWhatsAppReceipt = () => {
    if (!recordedPayment || !selectedCustomer) return;

    const msg = `*गिट्टी बालू डिपो (GittiBalu Depo)*\n` +
      `💳 *भुगतान रसीद (Payment Receipt)*\n` +
      `रसीद सं. (Receipt #): #${recordedPayment.paymentNumber}\n` +
      `📅 दिनांक: ${new Date(recordedPayment.paymentDate).toLocaleDateString('en-IN')}\n` +
      `👤 ग्राहक: ${selectedCustomer.name} (${selectedCustomer.mobile})\n\n` +
      `*प्राप्त राशि (Amount Received): ₹${(recordedPayment.amount / 100).toFixed(2)}*\n` +
      `माध्यम (Mode): ${recordedPayment.paymentMethod} ${recordedPayment.referenceNumber ? `(Ref: ${recordedPayment.referenceNumber})` : ''}\n\n` +
      `*नया बाकी बैलेंस (New Balance Due): ₹${(Math.max(0, selectedCustomer.currentBalance - recordedPayment.amount) / 100).toFixed(2)}*\n\n` +
      `धन्यवाद! 🙏`;

    const cleanMobile = selectedCustomer.mobile?.replace(/\D/g, '') || '';
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleSubmitPayment = async () => {
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customerId: selectedCustomerId,
        amount: Math.round(amt * 100),
        paymentMethod: paymentMode,
        referenceNumber: refNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await api.createPayment(payload);
      setRecordedPayment(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Receive Payment"
        subtitle="रुपये प्राप्त करें / जमा • Counter & Online Collection"
        showBack
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {recordedPayment ? (
            /* Success Receipt View */
            <GlassCard variant="highlight" style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Payment Recorded Successfully!</Text>
              <Text style={styles.successReceiptNumber}>Receipt #{recordedPayment.paymentNumber}</Text>

              <View style={styles.successDivider} />

              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Customer</Text>
                <Text style={styles.successValue}>{selectedCustomer?.name}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Amount Received</Text>
                <Text style={[styles.successValue, { color: Colors.success, fontSize: 18 }]}>
                  {formatCurrency(recordedPayment.amount)}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Mode</Text>
                <Text style={styles.successValue}>
                  {recordedPayment.paymentMethod} {recordedPayment.referenceNumber ? `(${recordedPayment.referenceNumber})` : ''}
                </Text>
              </View>

              <View style={styles.successDivider} />

              <GlassButton
                title="Share Receipt on WhatsApp"
                variant="primary"
                size="md"
                icon={<Ionicons name="logo-whatsapp" size={18} color="#FFF" />}
                onPress={handleWhatsAppReceipt}
                style={styles.whatsappBtn}
              />

              <GlassButton
                title="Download / Print PDF Receipt"
                variant="secondary"
                size="md"
                icon={<Ionicons name="document-text-outline" size={18} color={Colors.textPrimary} />}
                onPress={() => PrintService.printReceipt(recordedPayment._id, 'share')}
                style={styles.whatsappBtn}
              />

              <GlassButton
                title="View Customer Khata"
                variant="secondary"
                size="md"
                onPress={() => router.replace(`/customers/${selectedCustomerId}`)}
                style={styles.khataBtn}
              />
            </GlassCard>
          ) : (
            /* Collection Form */
            <View>
              {error && (
                <GlassCard variant="danger" style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>
                </GlassCard>
              )}

              {/* Customer Selector */}
              <GlassCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>1. Select Customer (ग्राहक)</Text>

                {selectedCustomer ? (
                  <View style={styles.selectedCustomerBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.custName}>{selectedCustomer.name}</Text>
                      <Text style={styles.custPhone}>
                        {selectedCustomer.mobile} {selectedCustomer.village ? `• ${selectedCustomer.village}` : ''}
                      </Text>
                      <View style={styles.dueRow}>
                        <Text style={styles.dueLabel}>Current Balance:</Text>
                        <AmountDisplay
                          amount={selectedCustomer.currentBalance}
                          size="sm"
                          color={selectedCustomer.currentBalance > 0 ? Colors.danger : Colors.success}
                        />
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedCustomerId('')}
                        style={styles.changeBtn}
                      >
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>

                      {selectedCustomer.currentBalance > 0 && (
                        <TouchableOpacity
                          onPress={handleSettleFullDue}
                          style={styles.settleBtn}
                        >
                          <Text style={styles.settleBtnText}>Settle Full Due</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <View>
                    <GlassInput
                      label="Search Customer"
                      placeholder="Name, phone or village..."
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      leftIcon="search-outline"
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.custChipsScroll}>
                      {customers.map((c: any) => (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => setSelectedCustomerId(c._id)}
                          style={styles.custChip}
                        >
                          <Text style={styles.custChipName}>{c.name}</Text>
                          <Text
                            style={[
                              styles.custChipDue,
                              { color: c.currentBalance > 0 ? Colors.danger : Colors.success },
                            ]}
                          >
                            {formatCurrency(c.currentBalance)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </GlassCard>

              {/* Amount Input */}
              <GlassCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>2. Amount to Receive (जमा राशि)</Text>
                <GlassInput
                  label="Amount in Rupees (₹) *"
                  placeholder="e.g. 5000"
                  value={amountRupees}
                  onChangeText={setAmountRupees}
                  keyboardType="decimal-pad"
                  prefix="₹"
                  style={styles.amountInput}
                />

                {/* Amount Quick Presets */}
                <View style={styles.amountPresetsRow}>
                  {[500, 1000, 2000, 5000, 10000].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setAmountRupees(amt.toString())}
                      style={styles.amtPresetChip}
                    >
                      <Text style={styles.amtPresetText}>+₹{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>

              {/* Payment Mode Selector */}
              <GlassCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>3. Payment Mode (माध्यम)</Text>

                <View style={styles.modeGrid}>
                  {(
                    [
                      { id: 'CASH', label: 'Cash (नकद)', icon: 'cash-outline' },
                      { id: 'UPI', label: 'UPI / QR (ऑनलाइन)', icon: 'phone-portrait-outline' },
                      { id: 'BANK', label: 'Bank Transfer (NEFT)', icon: 'business-outline' },
                      { id: 'CHEQUE', label: 'Cheque (चेक)', icon: 'card-outline' },
                    ] as const
                  ).map((m) => {
                    const active = paymentMode === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setPaymentMode(m.id)}
                        style={[styles.modeCard, active && styles.modeCardActive]}
                      >
                        <Ionicons
                          name={m.icon}
                          size={20}
                          color={active ? Colors.primaryLight : Colors.textSecondary}
                        />
                        <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {paymentMode !== 'CASH' && (
                  <GlassInput
                    label={
                      paymentMode === 'UPI'
                        ? 'UPI Ref / UTR #'
                        : paymentMode === 'CHEQUE'
                        ? 'Cheque #'
                        : 'Transaction Ref #'
                    }
                    placeholder="Enter reference details..."
                    value={refNumber}
                    onChangeText={setRefNumber}
                  />
                )}

                <GlassInput
                  label="Remarks / Notes (विवरण)"
                  placeholder="e.g. Handed at shop counter"
                  value={notes}
                  onChangeText={setNotes}
                />
              </GlassCard>

              {/* Confirm Button */}
              <GlassButton
                title={
                  amountRupees && parseFloat(amountRupees) > 0
                    ? `Confirm Payment (₹${parseFloat(amountRupees).toFixed(2)})`
                    : 'Confirm Payment (जमा करें)'
                }
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSubmitPayment}
                style={styles.submitBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 60 },
  errorCard: { padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { color: Colors.danger, fontSize: 13 },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  selectedCustomerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  custName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  custPhone: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dueLabel: { color: Colors.textMuted, fontSize: 12 },
  changeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.sm,
  },
  changeBtnText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '600' },
  settleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  settleBtnText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '700' },
  custChipsScroll: { marginTop: Spacing.xs },
  custChip: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  custChipName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  custChipDue: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  amountInput: { fontSize: 20, fontWeight: '700' },
  amountPresetsRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  amtPresetChip: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  amtPresetText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  modeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  modeCardActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primary,
  },
  modeLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  modeLabelActive: { color: Colors.primaryLight, fontWeight: '700' },
  submitBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
  successCard: { padding: Spacing.xl, alignItems: 'center' },
  successIconBox: { marginBottom: Spacing.md },
  successTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  successReceiptNumber: { color: Colors.primaryLight, fontSize: 14, fontWeight: '600', marginTop: 4 },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.lg,
  },
  successRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  successLabel: { color: Colors.textSecondary, fontSize: 14 },
  successValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  whatsappBtn: { width: '100%', marginBottom: Spacing.sm },
  khataBtn: { width: '100%' },
});
