import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffd33d',
        tabBarInactiveTintColor: '#d5d7db',

        headerStyle: { backgroundColor: '#25292e' },
        headerShadowVisible: false,
        headerTintColor: '#fff',

        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveBackgroundColor: 'rgba(255, 211, 61, 0.12)',

        // Optional: makes spacing feel more “iOS”
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,

        // Apple-glass mimic background (NO expo-blur)
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.glass]}>
            <View style={styles.sheen} />
            <View style={styles.topLine} />
            <View style={styles.bottomShade} />
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

    // This is what makes it float and sit higher
    left: 16,
    right: 16,
    bottom: 26, // <-- increase (30–34) if you want even higher

    // Less chunky than before
    height: 64,
    borderRadius: 22,

    // Must be transparent so the glass layer shows
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    overflow: 'hidden',

    // Shadow for the floating iOS feel
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  tabItem: {
    marginHorizontal: 8,
    marginVertical: 6,
    borderRadius: 16,
  },

  label: {
    fontSize: 12,
    marginBottom: 2,
  },

  icon: {
    marginTop: 6,
  },

  // ---- Apple-glass mimic (no blur) ----
  glass: {
    borderRadius: 22,

    // lighter + more “material” than your current dark slab
    backgroundColor: 'rgba(18, 18, 18, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },

  // angled light sheen = way less “cheap overlay”
  sheen: {
    position: 'absolute',
    top: -12,
    left: -20,
    right: -20,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    transform: [{ rotate: '-6deg' }],
  },

  // subtle top edge highlight like iOS materials
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },

  // bottom shade to add depth
  bottomShade: {
    position: 'absolute',
    bottom: -6,
    left: -10,
    right: -10,
    height: '55%',
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
  },
});
