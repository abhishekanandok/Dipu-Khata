import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

interface DispatchedLineItem {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
}

export default function NewDeliveryChallanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string }>();

  const [selectedSaleId, setSelectedSaleId] = useState(params.saleId || '');
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<DispatchedLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: salesData } = useQuery({
    queryKey: ['salesForDelivery', saleSearch],
    queryFn: () => api.getSales({ search: saleSearch.trim() || undefined, limit: 30 }),
  });
  const sales = salesData?.data?.sales || [];

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: api.getDrivers,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
  });

  const selectedSale = sales.find((s: any) => s._id === selectedSaleId);

  // When sale is selected, auto-populate items and address
  const handleSelectSale = (sale: any) => {
    setSelectedSaleId(sale._id);
    setDeliveryAddress(sale.notes || `${sale.customerName}'s Construction Site`);
    setItems(
      (sale.items || []).map((i: any) => ({
        materialId: i.materialId,
        materialName: i.materialName,
        quantity: i.quantity.toString(),
        unit: i.unit,
      }))
    );
  };

  const handleUpdateItemQuantity = (index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: val };
      return updated;
    });
  };

  const handleSubmitChallan = async () => {
    if (!selectedSaleId) {
      setError('Please select a sale invoice.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery site address.');
      return;
    }

    const validItems = items.filter((i) => (parseFloat(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setError('Please specify at least one material with dispatched quantity > 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        saleId: selectedSaleId,
        driverId: selectedDriverId || undefined,
        vehicleId: selectedVehicleId || undefined,
        deliveryAddress: deliveryAddress.trim(),
        items: validItems.map((i) => ({
          materialId: i.materialId,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
        })),
        notes: notes.trim() || undefined,
      };

      const result = await api.createDelivery(payload);
      router.replace(`/deliveries/${result._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue delivery challan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Issue Delivery Challan"
        subtitle="डिलीवरी चालान बनाएं • Dispatch Goods & Deduct Stock"
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

          {/* 1. Sale Invoice Selection */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Select Invoice (बिक्री बिल चुनें)</Text>

            {selectedSale ? (
              <View style={styles.selectedSaleBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceTitle}>#{selectedSale.invoiceNumber}</Text>
                  <Text style={styles.customerName}>
                    {selectedSale.customerName} ({selectedSale.customerMobile})
                  </Text>
                  <Text style={styles.deliveryStatusText}>
                    Delivery Status: {selectedSale.deliveryStatus}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedSaleId('')}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <GlassInput
                  label="Search Sales Invoices"
                  placeholder="Enter invoice #, customer name or phone..."
                  value={saleSearch}
                  onChangeText={setSaleSearch}
                  leftIcon="search-outline"
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.saleChipsScroll}>
                  {sales.slice(0, 8).map((s: any) => (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => handleSelectSale(s)}
                      style={styles.saleChip}
                    >
                      <Text style={styles.saleChipInv}>#{s.invoiceNumber}</Text>
                      <Text style={styles.saleChipCust}>{s.customerName}</Text>
                      <Text style={styles.saleChipStatus}>{s.deliveryStatus}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </GlassCard>

          {/* 2. Dispatched Quantities */}
          {selectedSale && (
            <GlassCard style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>2. Dispatched Materials (भेजा गया माल)</Text>
              <Text style={styles.sectionSub}>
                Adjust dispatched quantities for this specific trip.
              </Text>

              {items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.itemName}>{item.materialName}</Text>
                    <Text style={styles.itemUnit}>Unit: {item.unit}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <GlassInput
                      label="Dispatched Qty"
                      value={item.quantity}
                      onChangeText={(val) => handleUpdateItemQuantity(idx, val)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {/* 3. Driver & Vehicle Fleet Selection */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>3. Transport & Driver (गाड़ी एवं चालक)</Text>

            {/* Vehicle Selector */}
            <Text style={styles.inputSubLabel}>Select Vehicle (गाड़ी)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetChipsScroll}>
              {vehicles.map((v: any) => {
                const selected = selectedVehicleId === v._id;
                return (
                  <TouchableOpacity
                    key={v._id}
                    onPress={() => setSelectedVehicleId(selected ? '' : v._id)}
                    style={[styles.fleetChip, selected && styles.fleetChipActive]}
                  >
                    <Ionicons
                      name="car-outline"
                      size={16}
                      color={selected ? Colors.primaryLight : Colors.textSecondary}
                    />
                    <Text style={[styles.fleetChipText, selected && styles.fleetChipTextActive]}>
                      {v.vehicleNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Driver Selector */}
            <Text style={[styles.inputSubLabel, { marginTop: Spacing.sm }]}>Select Driver (चालक)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetChipsScroll}>
              {drivers.map((d: any) => {
                const selected = selectedDriverId === d._id;
                return (
                  <TouchableOpacity
                    key={d._id}
                    onPress={() => setSelectedDriverId(selected ? '' : d._id)}
                    style={[styles.fleetChip, selected && styles.fleetChipActive]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={selected ? Colors.primaryLight : Colors.textSecondary}
                    />
                    <Text style={[styles.fleetChipText, selected && styles.fleetChipTextActive]}>
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <GlassInput
              label="Delivery Site Address *"
              placeholder="e.g. Near Shiv Mandir, Ramgarh Site"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              style={{ marginTop: Spacing.sm }}
            />

            <GlassInput
              label="Challan Notes / Instructions"
              placeholder="e.g. Unload next to concrete mixer"
              value={notes}
              onChangeText={setNotes}
            />
          </GlassCard>

          {/* Confirm Button */}
          <GlassButton
            title="Issue Challan & Dispatch (चालान काटें)"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmitChallan}
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
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSub: { color: Colors.textMuted, fontSize: 11, marginBottom: Spacing.sm },
  selectedSaleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  invoiceTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  customerName: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  deliveryStatusText: { color: Colors.warning, fontSize: 11, fontWeight: '600', marginTop: 4 },
  changeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.sm,
  },
  changeBtnText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '600' },
  saleChipsScroll: { marginTop: Spacing.xs },
  saleChip: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  saleChipInv: { color: Colors.primaryLight, fontSize: 12, fontWeight: '700' },
  saleChipCust: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  saleChipStatus: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingVertical: 4,
  },
  itemName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  itemUnit: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  inputSubLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 4 },
  fleetChipsScroll: { marginBottom: Spacing.xs },
  fleetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  fleetChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  fleetChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  fleetChipTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  submitBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
