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
    backgroundColor: 'transparent', // important so glass layer shows
    borderTopWidth: 0,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    height: 74,
    overflow: 'hidden',
    paddingBottom: 6,

    // “floating glass” feel
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  tabItem: {
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 16,
  },

  glass: {
    borderRadius: 20,
    backgroundColor: 'rgba(18, 20, 24, 0.78)', // glass tint
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },

  // bright “sheen” on top half
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // thin highlight line near the top edge
  topLine: {
    position: 'absolute',
    top: 6,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },

  // slight darkening at the bottom for depth
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
});
