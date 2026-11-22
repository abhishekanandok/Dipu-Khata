import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassInput } from '../../components/glass/GlassInput';
import { api } from '../../services/api';

type FleetTab = 'DRIVERS' | 'VEHICLES';

export default function FleetIndexScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FleetTab>('DRIVERS');

  // Add Driver Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [addingDriver, setAddingDriver] = useState(false);

  // Add Vehicle Modal State
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<any>('TRACTOR');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Queries
  const {
    data: drivers = [],
    isLoading: driversLoading,
    refetch: refetchDrivers,
  } = useQuery({
    queryKey: ['drivers'],
    queryFn: api.getDrivers,
  });

  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
  });

  const handleAddDriver = async () => {
    if (!driverName.trim() || driverMobile.trim().length < 10) {
      Alert.alert('Required', 'Please enter driver name and 10-digit mobile number.');
      return;
    }

    setAddingDriver(true);
    try {
      await api.createDriver({
        name: driverName.trim(),
        mobile: driverMobile.trim(),
        licenseNumber: driverLicense.trim() || undefined,
      });
      setShowDriverModal(false);
      setDriverName('');
      setDriverMobile('');
      setDriverLicense('');
      await refetchDrivers();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to register driver.');
    } finally {
      setAddingDriver(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Required', 'Please enter a vehicle registration number.');
      return;
    }

    setAddingVehicle(true);
    try {
      await api.createVehicle({
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        capacity: vehicleCapacity.trim() || undefined,
      });
      setShowVehicleModal(false);
      setVehicleNumber('');
      setVehicleCapacity('');
      await refetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to register vehicle.');
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleCall = (mobile: string) => {
    if (mobile) Linking.openURL(`tel:${mobile}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Fleet & Drivers"
        subtitle="गाड़ी एवं चालक प्रबंधन • Transport Fleet"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={styles.container}>
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'DRIVERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('DRIVERS')}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={activeTab === 'DRIVERS' ? Colors.primaryLight : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'DRIVERS' && styles.tabTextActive]}>
              Drivers ({drivers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'VEHICLES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('VEHICLES')}
          >
            <Ionicons
              name="car-outline"
              size={18}
              color={activeTab === 'VEHICLES' ? Colors.primaryLight : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'VEHICLES' && styles.tabTextActive]}>
              Vehicles ({vehicles.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        {activeTab === 'DRIVERS' ? (
          <GlassButton
            title="+ Register New Driver (नया चालक)"
            variant="primary"
            size="md"
            icon={<Ionicons name="person-add-outline" size={18} color="#FFF" />}
            onPress={() => setShowDriverModal(true)}
            style={styles.addBtn}
          />
        ) : (
          <GlassButton
            title="+ Register New Vehicle (नई गाड़ी)"
            variant="primary"
            size="md"
            icon={<Ionicons name="car-outline" size={18} color="#FFF" />}
            onPress={() => setShowVehicleModal(true)}
            style={styles.addBtn}
          />
        )}

        {/* Drivers List */}
        {activeTab === 'DRIVERS' && (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <GlassCard style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSub}>📞 {item.mobile}</Text>
                    {item.licenseNumber && (
                      <Text style={styles.itemSub}>DL: {item.licenseNumber}</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity onPress={() => handleCall(item.mobile)} style={styles.callCircle}>
                  <Ionicons name="call" size={18} color={Colors.primaryLight} />
                </TouchableOpacity>
              </GlassCard>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={driversLoading} onRefresh={refetchDrivers} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="person-outline" size={48} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Drivers Registered</Text>
              </View>
            }
          />
        )}

        {/* Vehicles List */}
        {activeTab === 'VEHICLES' && (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <GlassCard style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <View style={styles.vehicleIconCircle}>
                    <Ionicons name="car" size={20} color={Colors.primaryLight} />
                  </View>
                  <View>
                    <Text style={styles.itemName}>{item.vehicleNumber}</Text>
                    <Text style={styles.itemSub}>
                      Type: {item.vehicleType} {item.capacity ? `• Capacity: ${item.capacity}` : ''}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={vehiclesLoading} onRefresh={refetchVehicles} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="car-outline" size={48} color={Colors.surfaceBorderStrong} />
                <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Add Driver Modal */}
      {showDriverModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Register Driver</Text>
              <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <GlassInput
              label="Driver Full Name *"
              placeholder="e.g. Ramesh Yadav"
              value={driverName}
              onChangeText={setDriverName}
            />
            <GlassInput
              label="Mobile Number *"
              placeholder="10-digit mobile number"
              value={driverMobile}
              onChangeText={setDriverMobile}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Driving License # (Optional)"
              placeholder="e.g. BR-01-2022-..."
              value={driverLicense}
              onChangeText={setDriverLicense}
            />

            <GlassButton
              title="Save Driver"
              variant="primary"
              size="md"
              loading={addingDriver}
              onPress={handleAddDriver}
              style={{ marginTop: Spacing.md }}
            />
          </GlassCard>
        </View>
      )}

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Register Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <GlassInput
              label="Vehicle Registration # *"
              placeholder="e.g. BR 01 GB 4321"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
            />

            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.typeGrid}>
              {(['TRACTOR', 'TIPPER', 'TRUCK_10_WHEELER', 'PICKUP', 'OTHER'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setVehicleType(t)}
                  style={[styles.typeChip, vehicleType === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeText, vehicleType === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassInput
              label="Capacity (Optional)"
              placeholder="e.g. 150 CFT or 10 TON"
              value={vehicleCapacity}
              onChangeText={setVehicleCapacity}
            />

            <GlassButton
              title="Save Vehicle"
              variant="primary"
              size="md"
              loading={addingVehicle}
              onPress={handleAddVehicle}
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
  container: { flex: 1, paddingHorizontal: Spacing.md },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginVertical: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  tabBtnActive: { backgroundColor: Colors.primaryGlass },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  addBtn: { marginBottom: Spacing.sm },
  listContent: { paddingBottom: 60 },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '700' },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  itemSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  callCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
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
  modalTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  typeChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  typeChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
  typeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  typeTextActive: { color: Colors.primaryLight },
});
