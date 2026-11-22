import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { useAuthStore } from '../../store/authStore';

export default function MoreTab() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const menuSections = [
    {
      title: 'Operations (दैनिक कार्य)',
      items: [
        { icon: 'wallet-outline', label: 'Receive Payment', hindi: 'भुगतान / जमा', route: '/(tabs)/khata' },
        { icon: 'document-text-outline', label: 'Estimates & Quotations', hindi: 'एस्टीमेट', route: '/(tabs)/sales' },
        { icon: 'newspaper-outline', label: 'Delivery Challans', hindi: 'डिलीवरी चालान', route: '/(tabs)/more' },
        { icon: 'car-outline', label: 'Drivers & Vehicles', hindi: 'गाड़ी एवं चालक', route: '/(tabs)/more' },
        { icon: 'trending-down-outline', label: 'Daily Expenses', hindi: 'दैनिक खर्च', route: '/(tabs)/more' },
      ],
    },
    {
      title: 'Accounting & Reports (खाता एवं रिपोर्ट)',
      items: [
        { icon: 'book-outline', label: 'Daily Cash Book', hindi: 'रोकड़ बही', route: '/(tabs)/more' },
        { icon: 'bar-chart-outline', label: 'Financial Reports', hindi: 'व्यापार रिपोर्ट', route: '/(tabs)/more' },
        { icon: 'cloud-offline-outline', label: 'Offline Sync Status', hindi: 'ऑफ़लाइन सिंक', route: '/(tabs)/more' },
      ],
    },
    {
      title: 'Account & Security (खाता सुरक्षा)',
      items: [
        { icon: 'key-outline', label: 'Change Password', hindi: 'पासवर्ड बदलें', route: '/(auth)/change-password' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="More Options"
        subtitle="अन्य विकल्प एवं सेटिंग्स"
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <GlassCard variant="highlight" style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </GlassCard>

        {/* Menu Sections */}
        {menuSections.map((sec, secIdx) => (
          <View key={secIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <GlassCard style={styles.menuCard}>
              {sec.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[styles.menuItem, itemIdx > 0 && styles.menuItemDivider]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={20} color={Colors.primaryLight} style={styles.itemIcon} />
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemHindi}>({item.hindi})</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out (लॉग आउट)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  userEmail: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemIcon: { marginRight: 12 },
  itemTextContainer: { flex: 1 },
  itemLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  itemHindi: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerGlass,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    gap: 8,
    marginTop: Spacing.sm,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
});
