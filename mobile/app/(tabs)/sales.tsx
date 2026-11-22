import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';

export default function SalesTab() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Sales & Billing"
        subtitle="बिक्री एवं इनवॉइस • Retail Counter"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <GlassCard variant="highlight" style={styles.card}>
          <Text style={styles.cardTitle}>Sales Register & Billing</Text>
          <Text style={styles.cardDesc}>
            Rapid counter billing, cash/credit split payments, and unique invoice generation.
          </Text>
          <GlassButton
            title="+ Create New Bill (नई बिक्री)"
            variant="primary"
            size="lg"
            onPress={() => {}}
            style={styles.btn}
          />
        </GlassCard>

        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Invoices Module Initialized</Text>
          <Text style={styles.emptySubtitle}>
            Full sales workflow will be implemented in Phase 6.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: 90 },
  card: { padding: Spacing.lg, marginBottom: Spacing.lg },
  cardTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  cardDesc: { color: Colors.textSecondary, fontSize: 13, marginVertical: 8 },
  btn: { marginTop: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
});
