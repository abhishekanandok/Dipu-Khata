import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';

export default function StockTab() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Stock & Inventory"
        subtitle="स्टॉक एवं सामग्री • Godown Inventory"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <GlassCard variant="highlight" style={styles.card}>
          <Text style={styles.cardTitle}>Material Inventory (स्टॉक)</Text>
          <Text style={styles.cardDesc}>
            Track Balu, Char, Gitti, Cement bags, Steel rods, and inward supplier purchases.
          </Text>
          <GlassButton
            title="+ Add Stock / Purchase (माल आवक)"
            variant="primary"
            size="lg"
            onPress={() => {}}
            style={styles.btn}
          />
        </GlassCard>

        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Inventory Module Initialized</Text>
          <Text style={styles.emptySubtitle}>
            Materials catalog and inward purchases will be activated in Phases 4 & 5.
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
