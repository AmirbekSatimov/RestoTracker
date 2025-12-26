import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs 
        screenOptions={{
            tabBarActiveTintColor: '#ffd33d',
            tabBarInactiveTintColor: '#d5d7db',
            headerStyle: {
                backgroundColor: '#25292e'
            },
            headerShadowVisible: false,
            headerTintColor: '#fff',
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabItem,
            tabBarActiveBackgroundColor: 'rgba(255, 211, 61, 0.12)',
            tabBarBackground: () => (
              <View style={[StyleSheet.absoluteFill, styles.glassBackground]}>
                <View style={styles.glassSheen} />
                <View style={styles.glassHighlight} />
                <View style={styles.glassLowlight} />
              </View>
            ),
        }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
            title: 'Home',
            tabBarIcon: ({ color, focused}) => (
                <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
            ),
         }} 
        />
      <Tabs.Screen 
        name="about" 
        options={{ 
            title: 'Add Location',
            tabBarIcon: ({color, focused }) => (
                <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24}/>
            ),
        }} 
        />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    height: 74,
    overflow: 'hidden',
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tabItem: {
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 16,
  },
  glassBackground: {
    borderRadius: 20,
    backgroundColor: 'rgba(30, 34, 40, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 6,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  glassLowlight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
});
