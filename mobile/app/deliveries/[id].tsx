import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/api';
import { PrintService } from '../../services/printService';

export default function DeliveryChallanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: delivery,
    isLoading,
  } = useQuery({
    queryKey: ['delivery', id],
    queryFn: () => api.getDeliveryById(id as string),
    enabled: !!id,
  });

  if (isLoading || !delivery) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GlassHeader title="Delivery Challan" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading challan details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDelivered = delivery.status === 'DELIVERED';

  const handleWhatsAppNotification = () => {
    const itemsList = (delivery.items || [])
      .map((i: any) => `• ${i.materialName}: ${i.quantity} ${i.unit}`)
      .join('\n');

    const msg = `*दीपु खाता एवं व्यापार (Dipu Khata & Trade)*\n` +
      `🚚 *सामान डिलीवरी चालान (Delivery Dispatch)*\n` +
      `चालान सं. (Challan #): #${delivery.challanNumber}\n` +
      `बिल सं. (Invoice #): #${delivery.invoiceNumber}\n` +
      `दिनांक: ${new Date(delivery.dispatchDate).toLocaleDateString('en-IN')}\n\n` +
      `गाड़ी सं. (Vehicle): ${delivery.vehicleNumber || 'Store Vehicle'}\n` +
      `चालक (Driver): ${delivery.driverName || 'Designated Driver'} (${delivery.driverMobile || ''})\n` +
      `डिलीवरी स्थल: ${delivery.deliveryAddress}\n\n` +
      `*भेजा गया सामान (Materials Dispatched):*\n${itemsList}\n\n` +
      `कृपया सामान पहुंचने पर मिलान कर लें। धन्यवाद! 🙏`;

    const cleanMobile = delivery.customerMobile?.replace(/\D/g, '') || '';
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleCallDriver = () => {
    if (delivery.driverMobile) {
      Linking.openURL(`tel:${delivery.driverMobile}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title={`Challan #${delivery.challanNumber}`}
        subtitle="Delivery Dispatch Note"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Status Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.challanTitle}>#{delivery.challanNumber}</Text>
              <Text style={styles.dateMeta}>
                Dispatch Date:{' '}
                {new Date(delivery.dispatchDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <StatusBadge
              status={isDelivered ? 'COMPLETED' : 'WARNING'}
              label={isDelivered ? 'Delivered' : 'In Transit (रास्ते में)'}
            />
          </View>
        </GlassCard>

        {/* Customer & Destination Card */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer & Destination</Text>
          <Text style={styles.customerName}>{delivery.customerName}</Text>
          <Text style={styles.customerPhone}>📞 {delivery.customerMobile}</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={16} color={Colors.primaryLight} />
            <Text style={styles.addressText}>{delivery.deliveryAddress}</Text>
          </View>
        </GlassCard>

        {/* Transport & Driver Card */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Transport Fleet & Driver</Text>
          <View style={styles.driverBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverVehicle}>
                Vehicle: {delivery.vehicleNumber || 'Store Vehicle'}
              </Text>
              <Text style={styles.driverName}>
                Driver: {delivery.driverName || 'Designated Driver'}
              </Text>
              {delivery.driverMobile && (
                <Text style={styles.driverPhone}>Mobile: {delivery.driverMobile}</Text>
              )}
            </View>
            {delivery.driverMobile && (
              <TouchableOpacity onPress={handleCallDriver} style={styles.callDriverBtn}>
                <Ionicons name="call" size={18} color={Colors.primaryLight} />
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>

        {/* Dispatched Materials Table */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dispatched Materials ({delivery.items?.length || 0})</Text>
          {(delivery.items || []).map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.materialName}</Text>
              <Text style={styles.itemQty}>
                {item.quantity} {item.unit}
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Notes */}
        {delivery.notes && (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{delivery.notes}</Text>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <GlassButton
            title="Download / Share PDF Challan"
            variant="primary"
            size="md"
            icon={<Ionicons name="document-text-outline" size={18} color="#FFF" />}
            onPress={() => PrintService.printChallan(id as string, 'share')}
            style={styles.actionBtn}
          />

          <GlassButton
            title="Print Challan (Thermal / A4)"
            variant="secondary"
            size="md"
            icon={<Ionicons name="print-outline" size={18} color={Colors.textPrimary} />}
            onPress={() => PrintService.printChallan(id as string, 'print')}
            style={styles.actionBtn}
          />

          <GlassButton
            title="Notify Customer on WhatsApp"
            variant="outline"
            size="md"
            icon={<Ionicons name="logo-whatsapp" size={18} color={Colors.success} />}
            onPress={handleWhatsAppNotification}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 60 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: 14 },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challanTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  dateMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  customerName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  customerPhone: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  addressText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600', flex: 1 },
  driverBox: { flexDirection: 'row', alignItems: 'center' },
  driverVehicle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  driverName: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  driverPhone: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  callDriverBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  itemName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  itemQty: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  notesText: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
  actionsContainer: { gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { width: '100%' },
});
