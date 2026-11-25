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

type AdjustmentType = 'ADD' | 'SUBTRACT' | 'DAMAGE' | 'WASTAGE';

export default function StockAdjustScreen() {
  const router = useRouter();

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [type, setType] = useState<AdjustmentType>('DAMAGE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Damaged during storage / handling');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.getMaterials(),
  });
  const materials = materialsData?.data || [];

  const selectedMaterial = materials.find((m: any) => m._id === selectedMaterialId);

  const types: Array<{ id: AdjustmentType; label: string; hindi: string; icon: string }> = [
    { id: 'DAMAGE', label: 'Damage', hindi: 'खराब', icon: 'trash-outline' },
    { id: 'WASTAGE', label: 'Wastage', hindi: 'बर्बादी', icon: 'remove-circle-outline' },
    { id: 'ADD', label: 'Surplus (+)', hindi: 'ऑडिट वृद्धि', icon: 'add-circle-outline' },
    { id: 'SUBTRACT', label: 'Shortage (-)', hindi: 'ऑडिट कमी', icon: 'alert-circle-outline' },
  ];

  const handleSubmit = async () => {
    if (!selectedMaterialId) {
      setError('Please select a material');
      return;
    }
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Audit explanation / reason is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.adjustStock({
        materialId: selectedMaterialId,
        type,
        quantity: qty,
        reason: reason.trim(),
      });
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Stock Adjustment"
        subtitle="स्टॉक सुधार एवं क्षति विवरण"
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
            <Text style={styles.cardTitle}>Select Material (सामग्री चुनें) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matScroll}>
              {materials.map((m: any) => {
                const active = selectedMaterialId === m._id;
                return (
                  <TouchableOpacity
                    key={m._id}
                    style={[styles.matPill, active && styles.matPillActive]}
                    onPress={() => setSelectedMaterialId(m._id)}
                  >
                    <Text style={[styles.matPillText, active && styles.matPillTextActive]}>
                      {m.name} ({m.currentStock} {m.defaultUnit})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedMaterial && (
              <View style={styles.currentStockNotice}>
                <Text style={styles.currentStockNoticeText}>
                  Current Stock: <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{selectedMaterial.currentStock} {selectedMaterial.defaultUnit}</Text>
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Adjustment Type (प्रकार) *:</Text>
            <View style={styles.typesGrid}>
              {types.map((t) => {
                const active = type === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeBtn, active && styles.typeBtnActive]}
                    onPress={() => {
                      setType(t.id);
                      if (t.id === 'DAMAGE') setReason('Damaged during storage / handling');
                      if (t.id === 'WASTAGE') setReason('Unloading & transport wastage');
                      if (t.id === 'ADD') setReason('Physical stock audit surplus');
                      if (t.id === 'SUBTRACT') setReason('Physical stock audit shortage');
                    }}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={18}
                      color={active ? '#FFFFFF' : Colors.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                      {t.label} ({t.hindi})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlassInput
              label={`Quantity (${selectedMaterial?.defaultUnit || 'Units'}) *`}
              placeholder="0"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />

            <GlassInput
              label="Audit Reason / Explanation (कारण / विवरण) *"
              placeholder="e.g. Rain water damage in godown bay 3"
              value={reason}
              onChangeText={setReason}
            />

            <Text style={styles.noticeText}>
              ℹ️ Every adjustment is permanently recorded in the append-only stock movement ledger.
            </Text>

            <GlassButton
              title="Post Stock Adjustment"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={{ marginTop: Spacing.sm }}
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
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  matScroll: { flexDirection: 'row', marginBottom: Spacing.md },
  matPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  matPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  matPillText: { color: Colors.textSecondary, fontSize: 12 },
  matPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  currentStockNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  currentStockNoticeText: { color: Colors.textSecondary, fontSize: 13 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  typeBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  typeBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  typeBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: '#FFFFFF' },
  noticeText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
});
