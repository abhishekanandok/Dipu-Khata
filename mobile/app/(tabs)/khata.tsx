import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';

export default function KhataTab() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Customer Khata"
        subtitle="ग्राहक खाता बही • Digital Ledger"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <GlassCard variant="highlight" style={styles.card}>
          <Text style={styles.cardTitle}>Customer Ledgers (खाता)</Text>
          <Text style={styles.cardDesc}>
            Manage customer accounts, track receivables, and view immutable double-entry ledger statements.
          </Text>
          <GlassButton
            title="+ Add Customer (नया ग्राहक)"
            variant="primary"
            size="lg"
            onPress={() => {}}
            style={styles.btn}
          />
        </GlassCard>

        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Khata Ledger Module Initialized</Text>
          <Text style={styles.emptySubtitle}>
            Customer management & digital ledger will be fully activated in Phase 3.
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
