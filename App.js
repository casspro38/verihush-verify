import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, ActivityIndicator, View, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './utils/supabase';

import AuthScreen from './screens/AuthScreen';
import LockScreen, { hasPinSet } from './screens/LockScreen';
import HomeScreen from './screens/HomeScreen';
import RecordScreen from './screens/RecordScreen';
import EvidenceScreen from './screens/EvidenceScreen';
import EvidenceDetailScreen from './screens/EvidenceDetailScreen';
import ReportScreen from './screens/ReportScreen';
import SettingsScreen from './screens/SettingsScreen';
import PlanScreen from './screens/PlanScreen';

const COLORS = { bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981', textSecondary: '#8899AA' };
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const LOCK_GRACE_PERIOD = 300000; // 30 seconds

function EvidenceStack({ duressMode }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EvidenceList">{(props) => <EvidenceScreen {...props} duressMode={duressMode} />}</Stack.Screen>
      <Stack.Screen name="EvidenceDetail" component={EvidenceDetailScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack({ duressMode }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain">{(props) => <SettingsScreen {...props} duressMode={duressMode} />}</Stack.Screen>
      <Stack.Screen name="PlanScreen" component={PlanScreen} />
    </Stack.Navigator>
  );
}

function MainTabs({ duressMode }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: '#1A3055',
          borderTopWidth: 1,
          height: 65 + bottomPadding,
          paddingBottom: bottomPadding + 8,
          paddingTop: 8,
          elevation: 20,
        },
        tabBarActiveTintColor: COLORS.blue,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Record') iconName = focused ? 'mic-circle' : 'mic-circle-outline';
          else if (route.name === 'Evidence') iconName = focused ? 'folder' : 'folder-outline';
          else if (route.name === 'Report') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">{(props) => <HomeScreen {...props} duressMode={duressMode} />}</Tab.Screen>
      <Tab.Screen name="Record">{(props) => <RecordScreen {...props} duressMode={duressMode} />}</Tab.Screen>
      <Tab.Screen name="Evidence">{(props) => <EvidenceStack {...props} duressMode={duressMode} />}</Tab.Screen>
      <Tab.Screen name="Report">{(props) => <ReportScreen {...props} duressMode={duressMode} />}</Tab.Screen>
      <Tab.Screen name="Settings">{(props) => <SettingsStack {...props} duressMode={duressMode} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [duressMode, setDuressMode] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const backgroundTimeRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkPinLock();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkPinLock();
      } else {
        setLocked(false);
        setPinExists(false);
      }
    });

    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (state === 'active' && pinExists) {
        const went = backgroundTimeRef.current;
        const elapsed = went ? Date.now() - went : Infinity;
        if (elapsed > LOCK_GRACE_PERIOD) {
          setLocked(true);
        }
        backgroundTimeRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateListener.remove();
    };
  }, [pinExists]);

  async function checkPinLock() {
    const exists = await hasPinSet();
    setPinExists(exists);
    if (exists) {
      setLocked(true);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.blue} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  if (locked && pinExists) {
    return (
      <SafeAreaProvider>
        <LockScreen onUnlock={(isDuress) => { setDuressMode(isDuress === true); setLocked(false); }} isSetup={false} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabs duressMode={duressMode} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}






