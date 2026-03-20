import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabase';
import { t } from '../i18n';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', textPrimary: '#FFFFFF', textSecondary: '#8899AA',
  border: '#1A3055',
};

const PIN_LENGTH = 6;
const PIN_KEY = 'verihush_pin';
const BIOMETRIC_KEY = 'verihush_biometric';
const DURESS_PIN_KEY = 'verihush_duress_pin';
const EMERGENCY_CONTACT_KEY = 'verihush_emergency_contact';

export async function hasPinSet() {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return pin !== null;
}

export async function isBiometricEnabled() {
  const val = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return val === 'true';
}

export async function savePIN(pin) {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function clearPIN() {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
}

export async function saveDuressPIN(pin) {
  await SecureStore.setItemAsync(DURESS_PIN_KEY, pin);
}

export async function getDuressPIN() {
  return await SecureStore.getItemAsync(DURESS_PIN_KEY);
}

export async function clearDuressPIN() {
  await SecureStore.deleteItemAsync(DURESS_PIN_KEY);
}

export async function saveEmergencyContact(contact) {
  await SecureStore.setItemAsync(EMERGENCY_CONTACT_KEY, contact);
}

export async function getEmergencyContact() {
  return await SecureStore.getItemAsync(EMERGENCY_CONTACT_KEY);
}


async function sendDuressAlert() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const contact = await SecureStore.getItemAsync(EMERGENCY_CONTACT_KEY);
    await supabase.from('duress_alerts').insert({
      user_id: session.user.id,
      emergency_contact: contact || null,
      triggered_at: new Date().toISOString(),
      status: 'triggered',
    });
    console.log('Duress alert sent');
  } catch (e) {
    console.log('Duress alert error:', e.message);
  }
}

export async function setBiometric(enabled) {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
}


export default function LockScreen({ onUnlock, isSetup }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(isSetup ? 'create' : 'verify');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSetup) {
      tryBiometric();
    }
  }, []);

  async function tryBiometric() {
    try {
      const bioEnabled = await isBiometricEnabled();
      if (!bioEnabled) return;

      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return;

      const authTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFingerprint = authTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
      if (!hasFingerprint) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock VeriHush',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (result.success) {
        onUnlock();
      }
    } catch (e) {
      console.log('Biometric error:', e.message);
    }
  }

  function shake() {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  async function handlePress(num) {
    const newPin = pin + num;
    setError('');

    if (newPin.length <= PIN_LENGTH) {
      setPin(newPin);
    }

    if (newPin.length === PIN_LENGTH) {
      if (step === 'create') {
        setConfirmPin(newPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (newPin === confirmPin) {
          await savePIN(newPin);
          // Ask about biometric setup
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (compatible && enrolled) {
            Alert.alert(
              'Biometric Unlock',
              'Would you like to enable fingerprint unlock?',
              [
                { text: 'No', onPress: () => { onUnlock(); } },
                { text: 'Yes', onPress: async () => { await setBiometric(true); onUnlock(); } },
              ]
            );
          } else {
            onUnlock();
          }
        } else {
          setError(t('lock.pins_not_match'));
          shake();
          setPin('');
          setStep('create');
          setConfirmPin('');
        }
      } else if (step === 'verify') {
        const savedPin = await SecureStore.getItemAsync(PIN_KEY);
        const duressPin = await SecureStore.getItemAsync(DURESS_PIN_KEY);
        if (newPin === savedPin) {
          onUnlock(false);
        } else if (duressPin && newPin === duressPin) {
          sendDuressAlert();
          onUnlock(true);
        } else {
          setError(t('lock.incorrect_pin'));
          shake();
          setPin('');
        }
      }
    }
  }
  function handleDelete() {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }

  function handleBiometric() {
    tryBiometric();
  }

  const title = step === 'create' ? t('lock.create_pin') : step === 'confirm' ? t('lock.confirm_pin') : t('lock.enter_pin');
  const subtitle = step === 'create'
    ? t('lock.create_pin')
    : step === 'confirm'
    ? t('lock.confirm_pin')
    : 'Unlock to access your evidence';

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.lockIcon}>
          <Ionicons name="shield-checkmark" size={40} color={COLORS.blue} />
        </View>
        <Text style={styles.appName}>VeriHush</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 20 }} />}
      </View>

      <View style={styles.keypad}>
        {[[1,2,3],[4,5,6],[7,8,9]].map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map(num => (
              <TouchableOpacity
                key={num}
                style={styles.key}
                onPress={() => handlePress(String(num))}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          {step === 'verify' ? (
            <TouchableOpacity style={styles.key} onPress={handleBiometric}>
              <Ionicons name="finger-print" size={28} color={COLORS.blue} />
            </TouchableOpacity>
          ) : (
            <View style={styles.keyEmpty} />
          )}
          <TouchableOpacity
            style={styles.key}
            onPress={() => handlePress('0')}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleDelete}>
            <Ionicons name="backspace-outline" size={28} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'space-between' },
  topSection: { alignItems: 'center', paddingTop: 80 },
  lockIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.blue + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  appName: { color: COLORS.blue, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 20 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  dotsRow: { flexDirection: 'row', marginTop: 30, gap: 14 },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.textSecondary,
  },
  dotFilled: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  dotError: { borderColor: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: 12, fontWeight: '600' },
  keypad: { paddingBottom: 40, paddingHorizontal: 40 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  key: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  keyEmpty: { width: 72, height: 72 },
  keyText: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '600' },
});














