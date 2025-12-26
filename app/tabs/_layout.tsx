import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

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
              <BlurView 
                intensity={Platform.OS === 'ios' ? 70 : 55}
                tint={Platform.OS === 'ios' ? 'systemChromeMaterialDark' : 'dark'}
                style={StyleSheet.absoluteFill}
              />
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
    backgroundColor: 'rgba(37, 41, 46, 0.65)',
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
});
