import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';
import DevScreen from '@presentation/screens/DevScreen';
import ListScreen from '@presentation/screens/ListScreen';
import MapScreen from '@presentation/screens/MapScreen';
import ProductDetailScreen from '@presentation/screens/ProductDetailScreen';
import SearchScreen from '@presentation/screens/SearchScreen';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import colors from '@presentation/styles/colors';
import { useHome } from '@presentation/context/HomeContext';
import type { HomeTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<HomeTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const Tabs = () => {
  const { t } = useHome();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          title: t('nav.list'),
          tabBarIcon: ({ color }) => (
            <Icon source="format-list-bulleted" color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: t('nav.search'),
          tabBarIcon: ({ color }) => <Icon source="magnify" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: t('nav.map'),
          tabBarIcon: ({ color }) => <Icon source="map-outline" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color }) => <Icon source="cog-outline" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Dev"
        component={DevScreen}
        options={{
          title: t('nav.dev'),
          tabBarIcon: ({ color }) => <Icon source="wrench-outline" color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          presentation: 'card',
          sheetAllowedDetents: [1],
          sheetLargestUndimmedDetent: 1,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
