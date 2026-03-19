import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', textPrimary: '#FFFFFF',
  textSecondary: '#8899AA', border: '#1A3055', purple: '#8B5CF6',
};

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: COLORS.textSecondary,
    icon: 'person',
    description: 'Try it out — see how VeriHush protects you',
    features: [
      { text: '3 evidence uploads (lifetime)', included: true },
      { text: '1 PDF report', included: true },
      { text: '50 MB storage', included: true },
      { text: 'SHA-256 hash protection', included: true },
      { text: 'GPS & consent detection', included: true },
      { text: 'Real-time streaming', included: false },
      { text: 'Unlimited uploads', included: false },
      { text: 'Hash chain verification', included: false },
      { text: 'Blockchain timestamp', included: false },
    ],
  },
  {
    id: 'guard',
    name: 'Guard',
    price: '$3.99',
    yearlyPrice: '$29.99',
    period: '/month',
    yearlyPeriod: '/year',
    savings: 'Save 37%',
    color: COLORS.green,
    icon: 'shield-checkmark',
    popular: true,
    description: 'Full protection for your everyday safety',
    features: [
      { text: 'Unlimited evidence uploads', included: true },
      { text: '10 PDF reports / month', included: true },
      { text: '1 GB storage', included: true },
      { text: 'SHA-256 hash protection', included: true },
      { text: 'GPS & consent detection', included: true },
      { text: 'Real-time streaming backup', included: true },
      { text: 'Hash chain verification', included: true },
      { text: 'QR code verification', included: true },
      { text: 'Blockchain timestamp', included: false },
      { text: 'AI emotion analysis', included: false },
    ],
  },
  {
    id: 'proof',
    name: 'Proof',
    price: '$7.99',
    yearlyPrice: '$59.99',
    period: '/month',
    yearlyPeriod: '/year',
    savings: 'Save 37%',
    color: COLORS.purple,
    icon: 'ribbon',
    description: 'Maximum legal power for serious situations',
    features: [
      { text: 'Everything in Guard, plus:', included: true, bold: true },
      { text: 'Unlimited PDF reports', included: true },
      { text: '10 GB storage', included: true },
      { text: 'Blockchain timestamp proof', included: true },
      { text: 'AI emotion analysis', included: true },
      { text: 'Priority cloud streaming', included: true },
      { text: 'Priority support', included: true },
      { text: 'Court expert consultation', included: true },
    ],
  },
];

export default function PlanScreen({ navigation }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();
      if (data?.plan) setCurrentPlan(data.plan);
    } catch (e) {
      console.log('Plan load error:', e);
    }
  };

  const handleSubscribe = (planId) => {
    if (planId === currentPlan) return;
    if (planId === 'free') return;
    Alert.alert(
      'Coming Soon',
      'In-app purchases will be available when the app launches on the App Store and Google Play.\n\nYou\'ll be one of the first to know!',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Plan</Text>
        </View>

        <Text style={styles.subtitle}>
          Protect what matters most.{'\n'}Pick the plan that fits your needs.
        </Text>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'monthly' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingBtnText, billingCycle === 'monthly' && styles.billingBtnTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'yearly' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingBtnText, billingCycle === 'yearly' && styles.billingBtnTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>-37%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billingCycle === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
          const period = billingCycle === 'yearly' && plan.yearlyPeriod ? plan.yearlyPeriod : plan.period;

          return (
            <View key={plan.id} style={[
              styles.planCard,
              { borderColor: isCurrent ? plan.color : COLORS.border },
              plan.popular && styles.popularCard,
            ]}>
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: plan.color + '20', borderColor: plan.color }]}>
                  <Ionicons name="checkmark-circle" size={14} color={plan.color} />
                  <Text style={[styles.currentText, { color: plan.color }]}> Current Plan</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIconCircle, { backgroundColor: plan.color + '20' }]}>
                  <Ionicons name={plan.icon} size={24} color={plan.color} />
                </View>
                <View style={styles.planTitleRow}>
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>{price}</Text>
                    <Text style={styles.planPeriod}>{period}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.planDesc}>{plan.description}</Text>

              <View style={styles.featureList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons
                      name={feature.included ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={feature.included ? COLORS.green : COLORS.textSecondary + '50'}
                    />
                    <Text style={[
                      styles.featureText,
                      !feature.included && styles.featureDisabled,
                      feature.bold && styles.featureBold,
                    ]}> {feature.text}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && plan.id !== 'free' && (
                <TouchableOpacity
                  style={[styles.subscribeBtn, { backgroundColor: plan.color }]}
                  onPress={() => handleSubscribe(plan.id)}
                >
                  <Text style={styles.subscribeBtnText}>
                    {plan.id === 'guard' ? 'Start Guard Plan' : 'Start Proof Plan'}
                  </Text>
                </TouchableOpacity>
              )}

              {isCurrent && plan.id !== 'free' && (
                <View style={[styles.subscribedBtn, { borderColor: plan.color }]}>
                  <Ionicons name="checkmark" size={18} color={plan.color} />
                  <Text style={[styles.subscribedBtnText, { color: plan.color }]}> Active</Text>
                </View>
              )}

              {plan.id === 'free' && !isCurrent && (
                <View style={styles.freeNote}>
                  <Text style={styles.freeNoteText}>You've upgraded — enjoy full protection!</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Common Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Can I cancel anytime?</Text>
            <Text style={styles.faqA}>Yes, cancel anytime from your App Store or Google Play settings. No hidden fees.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>What happens to my evidence if I downgrade?</Text>
            <Text style={styles.faqA}>Your existing evidence stays safe on our servers. You just can't upload new evidence until you upgrade again.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Is my data secure?</Text>
            <Text style={styles.faqA}>Absolutely. All evidence is encrypted with SHA-256 hashing and stored on secure cloud servers with row-level security.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Can I switch plans?</Text>
            <Text style={styles.faqA}>Yes, upgrade or downgrade anytime. Changes take effect immediately.</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  billingToggle: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  billingBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  billingBtnActive: { backgroundColor: COLORS.blue },
  billingBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  billingBtnTextActive: { color: '#FFF' },
  saveBadge: { backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  saveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  planCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1.5, overflow: 'hidden' },
  popularCard: { borderWidth: 2 },
  popularBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12 },
  popularText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  currentBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  currentText: { fontSize: 12, fontWeight: '600' },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  planTitleRow: { flex: 1 },
  planName: { fontSize: 20, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  planPrice: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  planPeriod: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 4 },
  planDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },

  featureList: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  featureDisabled: { color: COLORS.textSecondary + '80', textDecorationLine: 'line-through' },
  featureBold: { fontWeight: '700' },

  subscribeBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  subscribeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  subscribedBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1.5 },
  subscribedBtnText: { fontSize: 16, fontWeight: '700' },
  freeNote: { alignItems: 'center', paddingVertical: 10 },
  freeNoteText: { color: COLORS.green, fontSize: 13, fontWeight: '600' },

  faqSection: { marginTop: 10 },
  faqTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  faqItem: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  faqQ: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  faqA: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
