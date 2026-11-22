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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

export default function AddCustomerScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Opening Balance in Rupees (will be multiplied by 100 into paise on submission)
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setError('A valid 10-digit mobile number is required');
      return;
    }

    const rupees = parseFloat(openingBalance) || 0;
    const paise = Math.round(rupees * 100);

    setLoading(true);
    setError(null);
    try {
      const newCustomer = await api.createCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        village: village.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        openingBalance: paise,
        openingBalanceType: balanceType,
      });

      // Navigate directly to new customer's digital Khata
      router.replace(`/customers/${newCustomer.customer._id}` as any);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Add Customer"
        subtitle="नया ग्राहक खाता जोड़ें"
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

          {/* Personal Details */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardSectionTitle}>Personal Information (व्यक्तिगत विवरण)</Text>

            <GlassInput
              label="Full Name (पूरा नाम) *"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChangeText={setName}
            />

            <GlassInput
              label="Mobile Number (मोबाइल नंबर) *"
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />

            <GlassInput
              label="Village / Area (गांव / इलाका)"
              placeholder="e.g. Kalyanpur"
              value={village}
              onChangeText={setVillage}
            />

            <GlassInput
              label="Full Address (पता)"
              placeholder="House, landmark or site location"
              value={address}
              onChangeText={setAddress}
            />

            <GlassInput
              label="Notes (टिप्पणी / विवरण)"
              placeholder="e.g. Contractor for school project"
              value={notes}
              onChangeText={setNotes}
            />
          </GlassCard>

          {/* Opening Balance Migration Section */}
          <GlassCard variant="highlight" style={styles.card}>
            <Text style={styles.cardSectionTitle}>Opening Balance (पुरानी बाकी / जमा)</Text>
            <Text style={styles.cardSectionDesc}>
              Migrate existing handwritten ledger records. An automatic initial ledger entry will be posted.
            </Text>

            <GlassInput
              label="Amount in Rupees (राशि ₹)"
              placeholder="0"
              keyboardType="numeric"
              prefix="₹"
              value={openingBalance}
              onChangeText={setOpeningBalance}
            />

            <Text style={styles.balanceTypeLabel}>Balance Type (प्रकार):</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  balanceType === 'RECEIVABLE' && styles.toggleBtnActiveReceivable,
                ]}
                onPress={() => setBalanceType('RECEIVABLE')}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={18}
                  color={balanceType === 'RECEIVABLE' ? '#FFFFFF' : Colors.danger}
                />
                <Text
                  style={[
                    styles.toggleText,
                    balanceType === 'RECEIVABLE' && styles.toggleTextActive,
                  ]}
                >
                  Lena Hai (बाकी / Due)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  balanceType === 'PAYABLE' && styles.toggleBtnActivePayable,
                ]}
                onPress={() => setBalanceType('PAYABLE')}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={18}
                  color={balanceType === 'PAYABLE' ? '#FFFFFF' : Colors.success}
                />
                <Text
                  style={[
                    styles.toggleText,
                    balanceType === 'PAYABLE' && styles.toggleTextActive,
                  ]}
                >
                  Dena Hai (जमा / Adv)
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GlassButton
            title="Save Customer & Open Khata"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmit}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 40 },
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
  card: { padding: Spacing.lg, marginBottom: Spacing.lg },
  cardSectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSectionDesc: { color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.md },
  balanceTypeLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: Spacing.md },
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
  toggleBtnActiveReceivable: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  toggleBtnActivePayable: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  toggleText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },
  saveBtn: { marginTop: Spacing.sm },
});
