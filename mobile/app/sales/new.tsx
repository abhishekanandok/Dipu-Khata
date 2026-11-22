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
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { formatCurrency } from '../../components/common/AmountDisplay';
import { api } from '../../services/api';

interface LineItem {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  rate: string; // in ₹
}

export default function NewSaleScreen() {
  const router = useRouter();

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Quick Customer Creation Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustVillage, setNewCustVillage] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Items State
  const [items, setItems] = useState<LineItem[]>([
    { materialId: '', materialName: '', quantity: '1', unit: 'CFT', rate: '0' },
  ]);

  // Charges & Payments State
  const [discountRupees, setDiscountRupees] = useState('0');
  const [transportRupees, setTransportRupees] = useState('0');
  const [cashPaidRupees, setCashPaidRupees] = useState('0');
  const [upiPaidRupees, setUpiPaidRupees] = useState('0');
  const [upiRefNumber, setUpiRefNumber] = useState('');
  const [autoStockDeduct, setAutoStockDeduct] = useState(true);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: customersData, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => api.getCustomers(customerSearch, 'all', 1, 50),
  });
  const customers = customersData?.data || [];

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.getMaterials(),
  });
  const materials = materialsData?.data || [];

  const selectedCustomer = customers.find((c: any) => c._id === selectedCustomerId);

  // Real-time calculations
  const subtotalRupees = items.reduce((acc, item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    return acc + q * r;
  }, 0);

  const discount = parseFloat(discountRupees) || 0;
  const transport = parseFloat(transportRupees) || 0;
  const grandTotalRupees = Math.max(0, subtotalRupees - discount + transport);

  const cashPaid = parseFloat(cashPaidRupees) || 0;
  const upiPaid = parseFloat(upiPaidRupees) || 0;
  const totalPaidRupees = cashPaid + upiPaid;
  const remainingDueRupees = Math.max(0, grandTotalRupees - totalPaidRupees);

  // Handlers for Items
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { materialId: '', materialName: '', quantity: '1', unit: 'CFT', rate: '0' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
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

  const handleUpdateItem = (index: number, field: keyof LineItem, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Quick Payment Presets
  const handlePresetFullCash = () => {
    setCashPaidRupees(grandTotalRupees.toString());
    setUpiPaidRupees('0');
  };

  const handlePresetFullUPI = () => {
    setCashPaidRupees('0');
    setUpiPaidRupees(grandTotalRupees.toString());
  };

  const handlePresetFullCredit = () => {
    setCashPaidRupees('0');
    setUpiPaidRupees('0');
  };

  // Quick Customer Creation
  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustMobile.trim()) {
      Alert.alert('Required', 'Please enter customer name and 10-digit mobile number.');
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await api.createCustomer({
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        village: newCustVillage.trim() || undefined,
        openingBalance: 0,
        openingBalanceType: 'RECEIVABLE',
      });
      await refetchCustomers();
      setSelectedCustomerId(res._id);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustVillage('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Submit Sale Bill
  const handleSubmitSale = async () => {
    if (!selectedCustomerId) {
      setError('Please select a customer for this bill.');
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
      const payments = [];
      if (cashPaid > 0) {
        payments.push({ amount: Math.round(cashPaid * 100), method: 'CASH' });
      }
      if (upiPaid > 0) {
        payments.push({
          amount: Math.round(upiPaid * 100),
          method: 'UPI',
          referenceNumber: upiRefNumber.trim() || undefined,
        });
      }

      const payload = {
        customerId: selectedCustomerId,
        items: validItems.map((i) => ({
          materialId: i.materialId,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          rate: Math.round((parseFloat(i.rate) || 0) * 100),
        })),
        discount: Math.round(discount * 100),
        transportCharges: Math.round(transport * 100),
        payments,
        autoStockDeduction: autoStockDeduct,
        notes: notes.trim() || undefined,
      };

      const result = await api.createSale(payload);
      router.replace(`/sales/${result._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create sale invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Create New Bill"
        subtitle="नई बिक्री बिल • Rapid Counter Billing"
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
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={20} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </GlassCard>
          )}

          {/* Section 1: Customer Selection */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>1. Customer Details (ग्राहक)</Text>
              <TouchableOpacity
                onPress={() => setShowAddCustomerModal(true)}
                style={styles.inlineActionBtn}
              >
                <Ionicons name="person-add-outline" size={16} color={Colors.primaryLight} />
                <Text style={styles.inlineActionText}>+ New Customer</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer ? (
              <View style={styles.selectedCustomerBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCustName}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedCustMobile}>
                    {selectedCustomer.mobile} {selectedCustomer.village ? `• ${selectedCustomer.village}` : ''}
                  </Text>
                  <Text style={styles.selectedCustBalance}>
                    Current Khata:{' '}
                    <Text
                      style={{
                        color: selectedCustomer.currentBalance > 0 ? Colors.danger : Colors.success,
                        fontWeight: '700',
                      }}
                    >
                      {formatCurrency(selectedCustomer.currentBalance)}
                    </Text>
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedCustomerId('')}
                  style={styles.changeCustBtn}
                >
                  <Text style={styles.changeCustText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <GlassInput
                  label="Search Customer (ग्राहक खोजें)"
                  placeholder="Enter name, phone or village..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  leftIcon="search-outline"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.custChipsScroll}>
                  {customers.slice(0, 8).map((c: any) => (
                    <TouchableOpacity
                      key={c._id}
                      onPress={() => setSelectedCustomerId(c._id)}
                      style={styles.custChip}
                    >
                      <Text style={styles.custChipName}>{c.name}</Text>
                      <Text style={styles.custChipVillage}>{c.village || c.mobile}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </GlassCard>

          {/* Section 2: Items Builder */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>2. Materials & Rates (सामान एवं दर)</Text>
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

                  {/* Material Picker */}
                  <Text style={styles.inputLabel}>Select Material</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialChipsScroll}>
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
                          <Text style={[styles.matChipStock, selected && styles.matChipStockActive]}>
                            {m.currentStock} {m.defaultUnit}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Quantity, Unit & Rate Inputs */}
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

          {/* Section 3: Extra Charges & Discount */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>3. Transport & Discount (भाड़ा / छूट)</Text>
            <View style={styles.doubleInputRow}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Discount / छूट (₹)"
                  value={discountRupees}
                  onChangeText={setDiscountRupees}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Transport / भाड़ा (₹)"
                  value={transportRupees}
                  onChangeText={setTransportRupees}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </GlassCard>

          {/* Section 4: Split Payment Calculator */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>4. Payment Split (भुगतान)</Text>
              <Text style={styles.grandTotalBanner}>Total: ₹{grandTotalRupees.toFixed(2)}</Text>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              <TouchableOpacity onPress={handlePresetFullCash} style={styles.presetChip}>
                <Text style={styles.presetChipText}>Full Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePresetFullUPI} style={styles.presetChip}>
                <Text style={styles.presetChipText}>Full UPI</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePresetFullCredit} style={styles.presetChip}>
                <Text style={styles.presetChipText}>Full Udhar (बाकी)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.doubleInputRow}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="Cash Paid (नकद) ₹"
                  value={cashPaidRupees}
                  onChangeText={setCashPaidRupees}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <GlassInput
                  label="UPI Paid (ऑनलाइन) ₹"
                  value={upiPaidRupees}
                  onChangeText={setUpiPaidRupees}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {upiPaid > 0 && (
              <GlassInput
                label="UPI Ref / UTR # (Optional)"
                placeholder="e.g. UPI/2611/..."
                value={upiRefNumber}
                onChangeText={setUpiRefNumber}
              />
            )}

            {/* Live Remaining Balance Due Banner */}
            <View style={styles.remainingDueBox}>
              <Text style={styles.remainingDueLabel}>Remaining to Customer Khata (बाकी):</Text>
              <Text
                style={[
                  styles.remainingDueValue,
                  { color: remainingDueRupees > 0 ? Colors.danger : Colors.success },
                ]}
              >
                ₹{remainingDueRupees.toFixed(2)}
              </Text>
            </View>
          </GlassCard>

          {/* Section 5: Settings & Notes */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Auto-deduct Stock (स्टॉक घटाएं)</Text>
                <Text style={styles.toggleSubtitle}>
                  Immediately decrement stock on billing (recommended for counter sales)
                </Text>
              </View>
              <Switch
                value={autoStockDeduct}
                onValueChange={setAutoStockDeduct}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>

            <GlassInput
              label="Notes / Delivery Address (विवरण)"
              placeholder="e.g. Near Shiv Mandir, Vehicle BR-01-..."
              value={notes}
              onChangeText={setNotes}
            />
          </GlassCard>

          {/* Sticky Bottom Bill Generation Button */}
          <GlassButton
            title={`Generate Bill (₹${grandTotalRupees.toFixed(2)})`}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmitSale}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Quick Add Customer</Text>
              <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <GlassInput
              label="Customer Name *"
              placeholder="e.g. Rajesh Kumar"
              value={newCustName}
              onChangeText={setNewCustName}
            />
            <GlassInput
              label="Mobile Number *"
              placeholder="10-digit number"
              value={newCustMobile}
              onChangeText={setNewCustMobile}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Village / Colony"
              placeholder="e.g. Rampur"
              value={newCustVillage}
              onChangeText={setNewCustVillage}
            />

            <GlassButton
              title="Save & Select Customer"
              variant="primary"
              size="md"
              loading={creatingCustomer}
              onPress={handleCreateCustomer}
              style={{ marginTop: Spacing.md }}
            />
          </GlassCard>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 100 },
  errorCard: { padding: Spacing.md, marginBottom: Spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
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
  selectedCustomerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  selectedCustName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  selectedCustMobile: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  selectedCustBalance: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  changeCustBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceBorder,
  },
  changeCustText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },
  custChipsScroll: { marginTop: Spacing.sm },
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
  custChipVillage: { color: Colors.textMuted, fontSize: 11 },
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
  materialChipsScroll: { marginBottom: Spacing.sm },
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
  matChipStock: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  matChipStockActive: { color: Colors.primaryLight },
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
  grandTotalBanner: { color: Colors.primaryLight, fontSize: 15, fontWeight: '700' },
  presetsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  presetChip: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  presetChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  remainingDueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  remainingDueLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  remainingDueValue: { fontSize: 16, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  toggleTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  toggleSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  submitBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
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
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
});
