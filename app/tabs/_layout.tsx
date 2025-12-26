import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BubbleTabButton(props: any) {
  const { accessibilityState, children, onPress, style, ...rest } = props;
  const selected = !!accessibilityState?.selected;

  return (
    <Pressable
      onPress={onPress}
      // IMPORTANT: keep the navigator-provided style so each tab takes equal space
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
  const { width: screenWidth } = useWindowDimensions();

  // Pill size: tweak the multiplier (0.50–0.60) to taste
  const pillWidth = Math.round(screenWidth * 0.54);

  // TRUE horizontal centering for an absolutely positioned view
  const left = Math.max(0, Math.round((screenWidth - pillWidth) / 2));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarActiveTintColor: 'rgba(255,255,255,0.95)',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.70)',

        tabBarActiveBackgroundColor: 'transparent',

        // Bottom pill placement (centered)
        tabBarStyle: [
          styles.tabBar,
          {
            width: pillWidth,
            left, // <- this is what actually centers it
            bottom: Math.max(insets.bottom + 10, 12),
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
    height: 62,
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

  // each tab takes equal space and centers its contents
  buttonWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // oval selection bubble (not square)
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
