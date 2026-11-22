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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

const DEFAULT_UNITS = ['CFT', 'TON', 'BAG', 'KG', 'PIECE', 'TRIP'];

export default function AddMaterialScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [categoryName, setCategoryName] = useState('Balu');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('CFT');
  const [sellingRate, setSellingRate] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [minimumStockAlert, setMinimumStockAlert] = useState('10');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Material name is required');
      return;
    }

    const sellRupees = parseFloat(sellingRate) || 0;
    const buyRupees = parseFloat(purchaseRate) || 0;

    if (sellRupees < 0 || buyRupees < 0) {
      setError('Rates cannot be negative');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedCat = categories.find((c: any) => c.name === categoryName);

      await api.createMaterial({
        name: name.trim(),
        hindiName: hindiName.trim() || undefined,
        categoryId: selectedCat?._id,
        categoryName: categoryName || 'General',
        brand: brand.trim() || undefined,
        sku: sku.trim() || undefined,
        defaultUnit,
        sellingRate: Math.round(sellRupees * 100), // In paise
        purchaseRate: Math.round(buyRupees * 100), // In paise
        currentStock: parseFloat(currentStock) || 0,
        minimumStockAlert: parseFloat(minimumStockAlert) || 10,
      });

      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Add Material"
        subtitle="नई सामग्री एवं दर जोड़ें"
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

          {/* Basic Details */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Material Information (सामग्री विवरण)</Text>

            <GlassInput
              label="Material Name (अंग्रेजी नाम) *"
              placeholder="e.g. Balu White Sand / ACC Gold Cement"
              value={name}
              onChangeText={setName}
            />

            <GlassInput
              label="Hindi Name (हिंदी नाम)"
              placeholder="उदा. सफेद बालू / एसीसी गोल्ड"
              value={hindiName}
              onChangeText={setHindiName}
            />

            {/* Category Selector */}
            <Text style={styles.fieldLabel}>Category (श्रेणी):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {categories.map((c: any) => {
                const active = categoryName === c.name;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setCategoryName(c.name)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {c.name} {c.hindiName ? `(${c.hindiName})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Unit Selector */}
            <Text style={styles.fieldLabel}>Default Unit (माप की इकाई) *:</Text>
            <View style={styles.unitsGrid}>
              {DEFAULT_UNITS.map((u) => {
                const active = defaultUnit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, active && styles.unitBtnActive]}
                    onPress={() => setDefaultUnit(u)}
                  >
                    <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Brand (ब्रांड / निर्माता)"
                  placeholder="e.g. ACC, UltraTech, Tata"
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="SKU / Item Code"
                  placeholder="e.g. CEM-ACC-01"
                  value={sku}
                  onChangeText={setSku}
                />
              </View>
            </View>
          </GlassCard>

          {/* Pricing & Stock Configuration */}
          <GlassCard variant="highlight" style={styles.card}>
            <Text style={styles.cardTitle}>Pricing & Stock Levels (दर एवं स्टॉक)</Text>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label={`Selling Rate (बिक्री दर / ${defaultUnit}) *`}
                  placeholder="0.00"
                  keyboardType="numeric"
                  prefix="₹"
                  value={sellingRate}
                  onChangeText={setSellingRate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label={`Purchase Rate (खरीद दर / ${defaultUnit}) *`}
                  placeholder="0.00"
                  keyboardType="numeric"
                  prefix="₹"
                  value={purchaseRate}
                  onChangeText={setPurchaseRate}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label={`Initial Stock (${defaultUnit})`}
                  placeholder="0"
                  keyboardType="numeric"
                  value={currentStock}
                  onChangeText={setCurrentStock}
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label={`Min Alert Limit (${defaultUnit})`}
                  placeholder="10"
                  keyboardType="numeric"
                  value={minimumStockAlert}
                  onChangeText={setMinimumStockAlert}
                />
              </View>
            </View>
          </GlassCard>

          <GlassButton
            title="Save Material to Catalog"
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
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  pillsScroll: { flexDirection: 'row', marginBottom: Spacing.md },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  pillActive: {
    backgroundColor: Colors.primaryGlass,
    borderColor: Colors.primaryLight,
  },
  pillText: { color: Colors.textSecondary, fontSize: 12 },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  unitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  unitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  unitBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  unitBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  unitBtnTextActive: { color: '#FFFFFF' },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  saveBtn: { marginTop: Spacing.sm },
});
