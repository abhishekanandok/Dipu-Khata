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
import { formatCurrency, AmountDisplay } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

interface PurchaseLineItem {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  rate: string; // In rupees
}

export default function AddPurchaseScreen() {
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [transportCharges, setTransportCharges] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'UPI' | 'CREDIT'>('CREDIT');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseLineItem[]>([
    { materialId: '', materialName: '', quantity: '1', unit: 'BAG', rate: '0' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Supplier state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierMobile, setNewSupplierMobile] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Queries
  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.getMaterials(),
  });
  const materials = materialsData?.data || [];

  // Calculate subtotals in real time
  const subtotalRupees = items.reduce((acc, item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    return acc + q * r;
  }, 0);

  const transportRupees = parseFloat(transportCharges) || 0;
  const otherRupees = parseFloat(otherCharges) || 0;
  const grandTotalRupees = subtotalRupees + transportRupees + otherRupees;
  const paidRupees = parseFloat(amountPaid) || 0;
  const balanceDueRupees = Math.max(0, grandTotalRupees - paidRupees);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { materialId: '', materialName: '', quantity: '1', unit: 'BAG', rate: '0' },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectMaterial = (idx: number, matId: string) => {
    const mat = materials.find((m: any) => m._id === matId);
    if (!mat) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        materialId: mat._id,
        materialName: mat.name,
        unit: mat.defaultUnit,
        rate: (mat.purchaseRate / 100).toString(),
      };
      return updated;
    });
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim() || !newSupplierMobile.trim()) {
      setError('Supplier name and mobile are required');
      return;
    }
    setSupplierLoading(true);
    try {
      const supp = await api.createSupplier({
        name: newSupplierName.trim(),
        companyName: newSupplierCompany.trim() || undefined,
        mobile: newSupplierMobile.trim(),
      });
      await refetchSuppliers();
      setSelectedSupplierId(supp._id);
      setShowSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierCompany('');
      setNewSupplierMobile('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create supplier');
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      setError('Please select a supplier');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required');
      return;
    }
    const validItems = items.filter((it) => it.materialId && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) {
      setError('Please select at least one material with quantity');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createPurchase({
        invoiceNumber: invoiceNumber.trim(),
        supplierId: selectedSupplierId,
        items: validItems.map((it) => ({
          materialId: it.materialId,
          quantity: parseFloat(it.quantity),
          unit: it.unit,
          rate: Math.round((parseFloat(it.rate) || 0) * 100), // In paise
        })),
        transportCharges: Math.round(transportRupees * 100),
        otherCharges: Math.round(otherRupees * 100),
        amountPaid: Math.round(paidRupees * 100),
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Inward Purchase"
        subtitle="नई माल आवक एवं खरीद बिल"
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

          {/* Supplier & Bill Details */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Supplier & Invoice Details</Text>

            <View style={styles.supplierHeader}>
              <Text style={styles.fieldLabel}>Select Supplier (सप्लायर चुनें) *:</Text>
              <TouchableOpacity
                onPress={() => setShowSupplierModal(!showSupplierModal)}
                style={styles.addSuppBtn}
              >
                <Text style={styles.addSuppBtnText}>+ New Supplier</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Supplier Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierScroll}>
              {suppliers.map((s: any) => {
                const active = selectedSupplierId === s._id;
                return (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.suppPill, active && styles.suppPillActive]}
                    onPress={() => setSelectedSupplierId(s._id)}
                  >
                    <Text style={[styles.suppText, active && styles.suppTextActive]}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Add Supplier Card (Inline if clicked) */}
            {showSupplierModal && (
              <GlassCard variant="highlight" style={styles.quickAddCard}>
                <Text style={styles.quickAddTitle}>Add New Supplier</Text>
                <GlassInput
                  label="Supplier Name *"
                  placeholder="e.g. Shyam Traders"
                  value={newSupplierName}
                  onChangeText={setNewSupplierName}
                />
                <GlassInput
                  label="Company Name"
                  placeholder="e.g. UltraTech Depot"
                  value={newSupplierCompany}
                  onChangeText={setNewSupplierCompany}
                />
                <GlassInput
                  label="Mobile Number *"
                  placeholder="10-digit phone"
                  keyboardType="phone-pad"
                  value={newSupplierMobile}
                  onChangeText={setNewSupplierMobile}
                />
                <GlassButton
                  title="Save Supplier"
                  variant="primary"
                  size="sm"
                  loading={supplierLoading}
                  onPress={handleCreateSupplier}
                />
              </GlassCard>
            )}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Invoice / Challan No. *"
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                />
              </View>
            </View>
          </GlassCard>

          {/* Line Items Builder */}
          <GlassCard variant="highlight" style={styles.card}>
            <View style={styles.itemsHeader}>
              <Text style={styles.cardTitle}>Inward Materials (सामग्री आवक)</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={addItemRow}>
                <Ionicons name="add-circle" size={16} color={Colors.primaryLight} />
                <Text style={styles.addItemBtnText}>+ Add Material</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, idx) => (
              <View key={idx} style={[styles.itemBlock, idx > 0 && styles.itemDivider]}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemIndexText}>Material #{idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItemRow(idx)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Material Select Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matScroll}>
                  {materials.map((m: any) => {
                    const active = item.materialId === m._id;
                    return (
                      <TouchableOpacity
                        key={m._id}
                        style={[styles.matPill, active && styles.matPillActive]}
                        onPress={() => handleSelectMaterial(idx, m._id)}
                      >
                        <Text style={[styles.matPillText, active && styles.matPillTextActive]}>
                          {m.name} ({m.defaultUnit})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <GlassInput
                      label={`Quantity (${item.unit})`}
                      placeholder="0"
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={(val) => {
                        const copy = [...items];
                        copy[idx].quantity = val;
                        setItems(copy);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <GlassInput
                      label={`Purchase Rate (₹/${item.unit})`}
                      placeholder="0"
                      keyboardType="numeric"
                      prefix="₹"
                      value={item.rate}
                      onChangeText={(val) => {
                        const copy = [...items];
                        copy[idx].rate = val;
                        setItems(copy);
                      }}
                    />
                  </View>
                </View>

                <Text style={styles.lineTotalText}>
                  Item Total: ₹
                  {(
                    (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
                  ).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </GlassCard>

          {/* Charges, Payment & Totals */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Charges & Payment Settlement</Text>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Transport Charges (भाड़ा ₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="₹"
                  value={transportCharges}
                  onChangeText={setTransportCharges}
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Unloading / Other Charges (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="₹"
                  value={otherCharges}
                  onChangeText={setOtherCharges}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Amount Paid (चुकाई राशि ₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="₹"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Payment Mode:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {['CREDIT', 'CASH', 'BANK', 'UPI'].map((mode: any) => {
                    const active = paymentMethod === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.modePill, active && styles.modePillActive]}
                        onPress={() => setPaymentMethod(mode)}
                      >
                        <Text style={[styles.modeText, active && styles.modeTextActive]}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Final Totals Summary Banner */}
            <View style={styles.totalsBanner}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total (कुल खरीद राशि):</Text>
                <Text style={styles.totalValue}>₹{grandTotalRupees.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Balance Due (सप्लायर उधारी):</Text>
                <Text style={[styles.totalValue, { color: Colors.danger }]}>
                  ₹{balanceDueRupees.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassButton
            title="Confirm Inward Purchase & Update Stock"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 50 },
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
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  supplierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addSuppBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  addSuppBtnText: { color: Colors.primaryLight, fontSize: 12, fontWeight: '600' },
  supplierScroll: { flexDirection: 'row', marginBottom: Spacing.md },
  suppPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  suppPillActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primaryLight },
  suppText: { color: Colors.textSecondary, fontSize: 12 },
  suppTextActive: { color: '#FFFFFF', fontWeight: '700' },
  quickAddCard: { padding: Spacing.md, marginBottom: Spacing.md },
  quickAddTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemBtnText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
  itemBlock: { paddingVertical: 8 },
  itemDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', marginTop: 8 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemIndexText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '700' },
  matScroll: { flexDirection: 'row', marginBottom: 8 },
  matPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  matPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  matPillText: { color: Colors.textSecondary, fontSize: 12 },
  matPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  lineTotalText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  modePillActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  modeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  modeTextActive: { color: '#FFFFFF' },
  totalsBanner: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginTop: Spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: Colors.textSecondary, fontSize: 13 },
  totalValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  submitBtn: { marginTop: Spacing.sm },
});
