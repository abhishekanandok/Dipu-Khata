import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { api } from '../../services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(email.trim());
      setSuccessMessage(
        'If an account exists with this email, a reset token has been generated.'
      );
      if (res.data?.resetToken && res.data.resetToken !== 'token_dispatched_if_email_exists') {
        setDevToken(res.data.resetToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to request password reset');
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
            <Text style={styles.appTitle}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your registered email to receive a reset token</Text>
          </View>

          <GlassCard variant="highlight" style={styles.card}>
            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successAlert}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            )}

            {devToken && (
              <View style={styles.devTokenCard}>
                <Text style={styles.devTokenTitle}>Security Reset Token (Dev Mode):</Text>
                <Text selectable style={styles.devTokenCode}>{devToken}</Text>
                <TouchableOpacity
                  style={styles.quickResetLink}
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/reset-password',
                      params: { token: devToken },
                    })
                  }
                >
                  <Text style={styles.quickResetText}>Proceed to Reset Password →</Text>
                </TouchableOpacity>
              </View>
            )}

            <GlassInput
              label="Email Address (ईमेल)"
              placeholder="owner@dipukhata.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <GlassButton
              title="Request Reset Token"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />
          </GlassCard>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Back to Login</Text>
            </TouchableOpacity>
          </View>
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
    textAlign: 'center',
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
  devTokenCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: Colors.info,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  devTokenTitle: {
    color: Colors.info,
    fontSize: 12,
    fontWeight: '700',
  },
  devTokenCode: {
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
    marginVertical: 4,
  },
  quickResetLink: {
    marginTop: 4,
  },
  quickResetText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: Spacing.sm,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  loginLink: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
});
