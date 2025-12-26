import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Accent options:
// const ACCENT = '#34D399'; // mint
const ACCENT = '#2DD4BF'; // teal (recommended)
// const ACCENT = '#22D3EE'; // icy cyan

const TEXT_PRIMARY = 'rgba(255,255,255,0.92)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.16)';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const extraBottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TEXT_SECONDARY,

        headerStyle: { backgroundColor: '#25292e' },
        headerShadowVisible: false,
        headerTintColor: TEXT_PRIMARY,

        // removes yellow slab
        tabBarActiveBackgroundColor: 'transparent',

        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.tabItem,

        tabBarStyle: [
          styles.tabBar,
          {
            bottom: 0,
            paddingBottom: extraBottom,
            height: 62 + extraBottom,
          },
        ],

        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 60}
              tint={Platform.OS === 'ios' ? 'systemChromeMaterialDark' : 'dark'}
              style={[StyleSheet.absoluteFill, styles.blurClip]}
            />
            <View pointerEvents="none" style={styles.border} />
            <View pointerEvents="none" style={styles.topLine} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="about"
        options={{
          title: 'Add Location',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'information-circle' : 'information-circle-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    overflow: 'hidden',
    paddingTop: 6,

    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  tabItem: {
    marginHorizontal: 10,
    borderRadius: 16,
    paddingVertical: 8,
  },

  label: {
    fontSize: 12,
    marginTop: 2,
    color: TEXT_SECONDARY,
  },

  blurClip: {
    borderRadius: 22,
  },

  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },

  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
