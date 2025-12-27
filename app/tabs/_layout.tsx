import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function PillTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  // HARD-CODED PX (dp)
  const PILL_WIDTH_PX = 320;
  const PILL_HEIGHT_PX = 62;

  // move left/right (smaller = more left)
  const TAB_LEFT_PX = 41;

  // move up/down
  const TAB_BOTTOM_PX = Math.max(insets.bottom + 12, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.pillWrap,
        {
          width: PILL_WIDTH_PX,
          height: PILL_HEIGHT_PX,
          left: TAB_LEFT_PX,
          bottom: TAB_BOTTOM_PX,
        },
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 85 : 60}
          tint={Platform.OS === 'ios' ? 'systemChromeMaterialDark' : 'dark'}
          style={[StyleSheet.absoluteFill, styles.blurClip]}
        />
        <View pointerEvents="none" style={styles.outerBorder} />
        <View pointerEvents="none" style={styles.topLine} />
      </View>

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const iconName =
          route.name === 'index'
            ? isFocused
              ? 'home'
              : 'home-outline'
            : route.name === 'about'
            ? isFocused
              ? 'people'
              : 'people-outline'
            : isFocused
            ? 'ellipse'
            : 'ellipse-outline';

        const color = isFocused
          ? 'rgba(255,255,255,0.95)'
          : 'rgba(255,255,255,0.70)';

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.buttonWrap}
          >
            <View style={[styles.bubble, isFocused && styles.bubbleSelected]}>
              <Ionicons name={iconName as any} size={28} color={color} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false, // <-- kills the grey "Home" bar at the tabs level
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ headerShown: false, title: '' }} />
      <Tabs.Screen name="about" options={{ headerShown: false, title: '' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    position: 'absolute',
    borderRadius: 999,
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
  blurClip: { borderRadius: 999 },
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
  buttonWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bubble: {
    width: 64,
    height: 44,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bubbleSelected: { backgroundColor: 'rgba(255,255,255,0.14)' },
});
