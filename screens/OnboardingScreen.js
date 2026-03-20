import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  textPrimary: '#FFFFFF', textSecondary: '#8899AA',
};

const slides = [
  {
    id: '1',
    image: require('../assets/Logo.jpg'),
    title: 'Your Quiet Witness',
    subtitle: 'VeriHush silently records and protects\nevidence when you need it most.',
    color: COLORS.blue,
  },
  {
    id: '2',
    icon: 'mic',
    title: 'Smart Recording',
    subtitle: 'Real-time speech-to-text with\nthreat keyword detection.',
    color: '#F59E0B',
  },
  {
    id: '3',
    icon: 'finger-print',
    title: 'Tamper-Proof Evidence',
    subtitle: 'SHA-256 hash chain ensures\nyour evidence is court-ready.',
    color: COLORS.green,
  },
  {
    id: '4',
    icon: 'alert-circle',
    title: 'Duress Protection',
    subtitle: 'Hidden PIN shows a decoy screen\nwhile alerting your emergency contact.',
    color: '#FF5451',
  },
];

function SlideItem({ item }) {
  return (
    <View style={[slideStyles.container, { width }]}>
      {item.image ? (
        <Image source={item.image} style={{ width: 280, height: 280, borderRadius: 0, marginBottom: 40 }} resizeMode='contain' />
      ) : (
        <View style={[slideStyles.iconCircle, { backgroundColor: item.color + '20' }]}>  
          <Ionicons name={item.icon} size={80} color={item.color} />
        </View>
      )}
      <Text style={slideStyles.title}>{item.title}</Text>
      <Text style={slideStyles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onDone();
    }
  };

  const handleSkip = () => {
    onDone();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={slideStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      <TouchableOpacity style={slideStyles.skipBtn} onPress={handleSkip}>
        <Text style={slideStyles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item }) => <SlideItem item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View style={slideStyles.footer}>
        <View style={slideStyles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                slideStyles.dot,
                { backgroundColor: i === currentIndex ? COLORS.blue : COLORS.textSecondary + '40' },
                i === currentIndex && { width: 24 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={slideStyles.nextBtn} onPress={handleNext}>
          <Text style={slideStyles.nextText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center', marginBottom: 40,
  },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  skipBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { color: COLORS.textSecondary, fontSize: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 50 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  nextBtn: {
    backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  nextText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});





