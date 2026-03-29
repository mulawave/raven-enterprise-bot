import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation'

const { width, height } = Dimensions.get('window')

interface Slide {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'chatbubbles',
    iconColor: '#6C5CE7',
    iconBg: '#6C5CE720',
    title: 'Automate Your Business',
    subtitle:
      'Let Raven handle customer conversations, orders, and bookings via WhatsApp — so you can focus on growing.',
  },
  {
    id: '2',
    icon: 'trending-up',
    iconColor: '#00B894',
    iconBg: '#00B89420',
    title: 'Track Everything',
    subtitle:
      'Monitor orders, payments, and customer activity in real-time from your pocket. Pull-to-refresh for live data.',
  },
  {
    id: '3',
    icon: 'notifications',
    iconColor: '#FDCB6E',
    iconBg: '#FDCB6E20',
    title: 'Stay Notified',
    subtitle:
      'Instant push notifications for new orders, payments, and messages. Never miss a sale again.',
  },
]

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>
}

export function OnboardingScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index)
      }
    }
  ).current

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
    } else {
      navigation.replace('Login')
    }
  }

  function handleSkip() {
    navigation.replace('Login')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        style={{
          position: 'absolute',
          top: 60,
          right: 24,
          zIndex: 10,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: BorderRadius.full,
          backgroundColor: colors.surfaceElevated,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            {/* Icon circle */}
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: item.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 48,
                borderWidth: 2,
                borderColor: `${item.iconColor}40`,
              }}
            >
              <Ionicons name={item.icon} size={52} color={item.iconColor} />
            </View>

            <Text
              style={{
                fontSize: FontSize.display,
                fontWeight: '800',
                color: colors.text,
                textAlign: 'center',
                marginBottom: Spacing.lg,
                lineHeight: 44,
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                fontSize: FontSize.md,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 24,
              }}
            >
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Bottom: dots + button */}
      <View style={{ paddingHorizontal: 40, paddingBottom: 60 }}>
        {/* Pagination dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32, gap: 8 }}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: currentIndex === idx ? 28 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentIndex === idx ? colors.primary : colors.surfaceElevated,
              }}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            height: 56,
            borderRadius: BorderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'rocket-outline' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}
