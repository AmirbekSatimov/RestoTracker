import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BubbleTabButton(props: any) {
  const { accessibilityState, children, onPress, style, ...rest } = props;
  const selected = !!accessibilityState?.selected;

  return (
    <Pressable
      onPress={onPress}
      style={[style, styles.buttonWrap]}
      {...rest}
    >
      <View style={[styles.bubble, selected && styles.bubbleSelected]}>
        {children}
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  /**
   * HARD-CODED PIXELS (EDIT THESE)
   * These are the only values that control positioning.
   */
  const PILL_WIDTH_PX = 320;
  const PILL_HEIGHT_PX = 62;

  // THIS is the line that moves it left/right.
  // Example: 0 = flush left, 40 = a bit right, 200 = far right.
  const TAB_LEFT_PX = 292; // <-- change this until it looks centered on YOUR simulator

  // THIS moves it up/down.
  const TAB_BOTTOM_PX = Math.max(insets.bottom + 12, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: 'rgba(255,255,255,0.95)',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.70)',
        tabBarActiveBackgroundColor: 'transparent',

        tabBarStyle: [
          styles.tabBar,
          {
            width: PILL_WIDTH_PX,
            height: PILL_HEIGHT_PX,

            // CRITICAL: do NOT set right: 0 or it will fight your left pixel positioning
            left: TAB_LEFT_PX, // <-- THIS MOVES IT
            bottom: TAB_BOTTOM_PX,
          },
        ],

        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 60}
              tint={Platform.OS === 'ios' ? 'systemChromeMaterialDark' : 'dark'}
              style={[StyleSheet.absoluteFill, styles.blurClip]}
            />
            <View pointerEvents="none" style={styles.outerBorder} />
            <View pointerEvents="none" style={styles.topLine} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: (props) => <BubbleTabButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="about"
        options={{
          tabBarButton: (props) => <BubbleTabButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={28}
              color={color}
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
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },

  blurClip: {
    borderRadius: 999,
  },

  outerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  buttonWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bubble: {
    width: 64,
    height: 44,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  bubbleSelected: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
