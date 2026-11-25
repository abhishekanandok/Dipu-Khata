import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.appTitle}>Change Password</Text>
            <Text style={styles.subtitle}>Update your security credentials</Text>
          </View>

          <GlassCard variant="highlight" style={styles.card}>
            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successAlert}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.successAlertText}>
                  Password changed successfully! Returning...
                </Text>
              </View>
            )}

            <GlassInput
              label="Current Password (वर्तमान पासवर्ड)"
              placeholder="••••••••"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <GlassInput
              label="New Password (नया पासवर्ड)"
              placeholder="At least 6 characters"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <GlassInput
              label="Confirm New Password (पासवर्ड पुष्टि)"
              placeholder="Re-enter new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <GlassButton
              title="Update Password"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleChangePassword}
              style={styles.submitBtn}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    padding: Spacing.xl,
  },
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
  errorAlertText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successGlass,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
    gap: 8,
  },
  successAlertText: {
    color: Colors.success,
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    marginTop: Spacing.sm,
    width: '100%',
  },
});
