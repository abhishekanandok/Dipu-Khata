import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

interface EstimateLineItem {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  rate: string; // in ₹
}

export default function NewEstimateScreen() {
  const router = useRouter();

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [village, setVillage] = useState('');
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<EstimateLineItem[]>([
    { materialId: '', materialName: '', quantity: '1', unit: 'CFT', rate: '0' },
  ]);

  const [discountRupees, setDiscountRupees] = useState('0');
  const [transportRupees, setTransportRupees] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.getMaterials(),
  });
  const materials = materialsData?.data || [];

  // Calculations
  const subtotalRupees = items.reduce((acc, item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    return acc + q * r;
  }, 0);

  const discount = parseFloat(discountRupees) || 0;
  const transport = parseFloat(transportRupees) || 0;
  const grandTotalRupees = Math.max(0, subtotalRupees - discount + transport);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { materialId: '', materialName: '', quantity: '1', unit: 'CFT', rate: '0' },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectMaterial = (index: number, matId: string) => {
    const mat = materials.find((m: any) => m._id === matId);
    if (!mat) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        materialId: mat._id,
        materialName: mat.name,
        unit: mat.defaultUnit,
        rate: (mat.sellingRate / 100).toString(),
      };
      return updated;
    });
  };

  const handleUpdateItem = (index: number, field: keyof EstimateLineItem, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmitEstimate = async () => {
    if (!customerName.trim() || customerMobile.trim().length < 10) {
      setError('Please enter valid customer name and 10-digit mobile number.');
      return;
    }

    const validItems = items.filter((i) => i.materialId && (parseFloat(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setError('Please add at least one material with quantity > 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        village: village.trim() || undefined,
        items: validItems.map((i) => ({
          materialId: i.materialId,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          rate: Math.round((parseFloat(i.rate) || 0) * 100),
        })),
        discount: Math.round(discount * 100),
        transportCharges: Math.round(transport * 100),
        notes: notes.trim() || undefined,
      };

      const result = await api.createEstimate(payload);
      router.replace(`/estimates/${result._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create estimate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Create Estimate"
        subtitle="नया कोटेशन • Price Quote"
        showBack
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {error && (
            <GlassCard variant="danger" style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          )}

          {/* Customer Card */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Prospective Customer (ग्राहक विवरण)</Text>
            <GlassInput
              label="Customer Name *"
              placeholder="e.g. Anand Sharma (Contractor)"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <GlassInput
              label="Mobile Number *"
              placeholder="10-digit mobile number"
              value={customerMobile}
              onChangeText={setCustomerMobile}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Site Village / Location"
              placeholder="e.g. Bikrampur Site"
              value={village}
              onChangeText={setVillage}
            />
          </GlassCard>

          {/* Items Card */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>2. Quoted Materials (सामान)</Text>
              <TouchableOpacity onPress={handleAddItem} style={styles.inlineActionBtn}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primaryLight} />
                <Text style={styles.inlineActionText}>+ Add Material</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => {
              const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);

              return (
                <View key={index} style={styles.itemRowContainer}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIndexLabel}>Item #{index + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.inputLabel}>Select Material</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matScroll}>
                    {materials.map((m: any) => {
                      const selected = item.materialId === m._id;
                      return (
                        <TouchableOpacity
                          key={m._id}
                          onPress={() => handleSelectMaterial(index, m._id)}
                          style={[styles.matChip, selected && styles.matChipActive]}
                        >
                          <Text style={[styles.matChipText, selected && styles.matChipTextActive]}>
                            {m.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.tripleInputRow}>
                    <View style={{ flex: 1.2 }}>
                      <GlassInput
                        label="Quantity"
                        value={item.quantity}
                        onChangeText={(val) => handleUpdateItem(index, 'quantity', val)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <GlassInput
                        label="Unit"
                        value={item.unit}
                        onChangeText={(val) => handleUpdateItem(index, 'unit', val)}
                      />
                    </View>
                    <View style={{ flex: 1.4 }}>
                      <GlassInput
                        label="Rate (₹)"
                        value={item.rate}
                        onChangeText={(val) => handleUpdateItem(index, 'rate', val)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.lineTotalRow}>
                    <Text style={styles.lineTotalLabel}>Line Total:</Text>
                    <Text style={styles.lineTotalValue}>₹{lineTotal.toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>

          {/* Charges */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>3. Transport & Discount</Text>
            <View style={styles.doubleInputRow}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Discount (₹)"
                  value={discountRupees}
                  onChangeText={setDiscountRupees}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Transport (₹)"
                  value={transportRupees}
                  onChangeText={setTransportRupees}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <GlassInput
              label="Quotation Notes"
              placeholder="e.g. Rates valid for 7 days"
              value={notes}
              onChangeText={setNotes}
            />
          </GlassCard>

          {/* Submit */}
          <GlassButton
            title={`Create Quotation (₹${grandTotalRupees.toFixed(2)})`}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmitEstimate}
            style={styles.submitBtn}
          />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  inlineActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineActionText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
  itemRowContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  itemIndexLabel: { color: Colors.primaryLight, fontSize: 13, fontWeight: '700' },
  inputLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  matScroll: { marginBottom: Spacing.sm },
  matChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  matChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  matChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  matChipTextActive: { color: Colors.primaryLight },
  tripleInputRow: { flexDirection: 'row', gap: Spacing.xs },
  doubleInputRow: { flexDirection: 'row', gap: Spacing.sm },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xs,
  },
  lineTotalLabel: { color: Colors.textMuted, fontSize: 12 },
  lineTotalValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  submitBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
