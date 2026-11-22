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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

export default function AdjustmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; type?: 'DEBIT' | 'CREDIT' }>();

  const customerId = params.id;
  const customerName = params.name || 'Customer';

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>(params.type || 'CREDIT');
  const [description, setDescription] = useState(
    params.type === 'CREDIT' ? 'Payment Received / जमा' : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const rupees = parseFloat(amount) || 0;
    if (rupees <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }
    if (!description.trim() || description.trim().length < 3) {
      setError('Please provide a descriptive reason or reference');
      return;
    }

    const paise = Math.round(rupees * 100);

    setLoading(true);
    setError(null);
    try {
      await api.addCustomerAdjustment(customerId!, {
        amount: paise,
        type,
        description: description.trim(),
      });
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to post adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Ledger Entry / Adjustment"
        subtitle={`ग्राहक: ${customerName}`}
        rightAction={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {error && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GlassCard variant="highlight" style={styles.card}>
            <Text style={styles.cardTitle}>Transaction Type (प्रकार)</Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, type === 'CREDIT' && styles.toggleCreditActive]}
                onPress={() => {
                  setType('CREDIT');
                  if (!description) setDescription('Payment Received / जमा');
                }}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={18}
                  color={type === 'CREDIT' ? '#FFFFFF' : Colors.success}
                />
                <Text style={[styles.toggleText, type === 'CREDIT' && styles.toggleTextActive]}>
                  Credit / जमा (Payment)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, type === 'DEBIT' && styles.toggleDebitActive]}
                onPress={() => {
                  setType('DEBIT');
                  if (description === 'Payment Received / जमा') setDescription('');
                }}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={18}
                  color={type === 'DEBIT' ? '#FFFFFF' : Colors.danger}
                />
                <Text style={[styles.toggleText, type === 'DEBIT' && styles.toggleTextActive]}>
                  Debit / बाकी (Charge)
                </Text>
              </TouchableOpacity>
            </View>

            <GlassInput
              label="Amount in Rupees (राशि ₹) *"
              placeholder="0.00"
              keyboardType="numeric"
              prefix="₹"
              value={amount}
              onChangeText={setAmount}
            />

            <GlassInput
              label="Description / Reason (विवरण / संदर्भ) *"
              placeholder="e.g. Cash collected / Old bill settlement / Extra charge"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.noticeText}>
              ℹ️ This entry will be immutably recorded in the double-entry customer ledger with an audit timestamp.
            </Text>

            <GlassButton
              title="Post to Khata (खाते में दर्ज करें)"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerGlass,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
  card: { padding: Spacing.lg },
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  toggleCreditActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  toggleDebitActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  toggleText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },
  noticeText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  submitBtn: { width: '100%' },
});
