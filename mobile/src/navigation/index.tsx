import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useBadges } from '../contexts/BadgeContext'
import { FontSize } from '../constants/theme'
import { Platform } from 'react-native'

// Auth screens
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { CheckEmailScreen } from '../screens/CheckEmailScreen'

// Main screens
import { HomeScreen } from '../screens/HomeScreen'
import { ConversationsScreen } from '../screens/ConversationsScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { OrdersScreen } from '../screens/OrdersScreen'
import { OrderDetailScreen } from '../screens/OrderDetailScreen'
import { PaymentsScreen } from '../screens/PaymentsScreen'
import { MoreScreen } from '../screens/MoreScreen'
import { CustomersScreen } from '../screens/CustomersScreen'
import { BookingsScreen } from '../screens/BookingsScreen'
import { CatalogueScreen } from '../screens/CatalogueScreen'
import { BroadcastScreen } from '../screens/BroadcastScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { ContactsScreen } from '../screens/ContactsScreen'
import { BotsScreen } from '../screens/BotsScreen'
import { FaqsScreen } from '../screens/FaqsScreen'
import { EmailListScreen } from '../screens/EmailListScreen'
import { AnalyticsScreen } from '../screens/AnalyticsScreen'
import { SubscriptionScreen } from '../screens/SubscriptionScreen'

// ── Type definitions ──────────────────────────────────────────────────────

export type AuthStackParamList = {
  Onboarding: undefined
  Login: undefined
  Register: undefined
  CheckEmail: { email: string; fromLogin?: boolean }
}

export type HomeStackParamList = {
  HomeMain: undefined
  Notifications: undefined
}

export type ChatsStackParamList = {
  ConversationsList: undefined
  Chat: { conversationId: string; name: string; customerPhone?: string }
}

export type OrdersStackParamList = {
  OrdersList: undefined
  OrderDetail: { orderId: string }
}

export type PaymentsStackParamList = {
  PaymentsList: undefined
}

export type MoreStackParamList = {
  MoreMenu: undefined
  Customers: undefined
  Bookings: undefined
  Catalogue: undefined
  Broadcast: undefined
  Settings: undefined
  Contacts: undefined
  Bots: undefined
  Faqs: undefined
  EmailList: undefined
  Analytics: undefined
  Subscription: undefined
}

export type MainTabParamList = {
  Home: undefined
  Chats: undefined
  Orders: undefined
  Payments: undefined
  More: undefined
}

// ── Stack navigators ──────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const HomeStack = createNativeStackNavigator<HomeStackParamList>()
const ChatsStack = createNativeStackNavigator<ChatsStackParamList>()
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>()
const PaymentsStack = createNativeStackNavigator<PaymentsStackParamList>()
const MoreStack = createNativeStackNavigator<MoreStackParamList>()
const MainTab = createBottomTabNavigator<MainTabParamList>()

// ── Auth Navigator ────────────────────────────────────────────────────────

export function AuthNavigator() {
  const { colors } = useTheme()

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="CheckEmail" component={CheckEmailScreen} />
    </AuthStack.Navigator>
  )
}

// ── Tab stacks ────────────────────────────────────────────────────────────

function HomeStackNavigator() {
  const { colors } = useTheme()
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  )
}

function ChatsStackNavigator() {
  const { colors } = useTheme()
  return (
    <ChatsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <ChatsStack.Screen name="ConversationsList" component={ConversationsScreen} />
      <ChatsStack.Screen name="Chat" component={ChatScreen} />
    </ChatsStack.Navigator>
  )
}

function OrdersStackNavigator() {
  const { colors } = useTheme()
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <OrdersStack.Screen name="OrdersList" component={OrdersScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  )
}

function PaymentsStackNavigator() {
  const { colors } = useTheme()
  return (
    <PaymentsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <PaymentsStack.Screen name="PaymentsList" component={PaymentsScreen} />
    </PaymentsStack.Navigator>
  )
}

function MoreStackNavigator() {
  const { colors } = useTheme()
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Customers" component={CustomersScreen} />
      <MoreStack.Screen name="Bookings" component={BookingsScreen} />
      <MoreStack.Screen name="Catalogue" component={CatalogueScreen} />
      <MoreStack.Screen name="Broadcast" component={BroadcastScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="Contacts" component={ContactsScreen} />
      <MoreStack.Screen name="Bots" component={BotsScreen} />
      <MoreStack.Screen name="Faqs" component={FaqsScreen} />
      <MoreStack.Screen name="EmailList" component={EmailListScreen} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
      <MoreStack.Screen name="Subscription" component={SubscriptionScreen} />
    </MoreStack.Navigator>
  )
}

// ── Main Tab Navigator ────────────────────────────────────────────────────

export function MainNavigator() {
  const { colors } = useTheme()
  const { badges } = useBadges()

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '600',
        },
        tabBarBadgeStyle: {
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          lineHeight: 14,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Chats: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Orders: focused ? 'receipt' : 'receipt-outline',
            Payments: focused ? 'card' : 'card-outline',
            More: focused ? 'grid' : 'grid-outline',
          }
          return (
            <Ionicons name={icons[route.name]} size={22} color={color} />
          )
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarBadge: badges.notifications > 0 ? badges.notifications : undefined }}
      />
      <MainTab.Screen
        name="Chats"
        component={ChatsStackNavigator}
        options={{ tabBarBadge: badges.chats > 0 ? badges.chats : undefined }}
      />
      <MainTab.Screen
        name="Orders"
        component={OrdersStackNavigator}
        options={{ tabBarBadge: badges.orders > 0 ? badges.orders : undefined }}
      />
      <MainTab.Screen name="Payments" component={PaymentsStackNavigator} />
      <MainTab.Screen name="More" component={MoreStackNavigator} />
    </MainTab.Navigator>
  )
}
