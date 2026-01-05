import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import DevScreen from '@presentation/screens/DevScreen';
import ListScreen from '@presentation/screens/ListScreen';
import MapScreen from '@presentation/screens/MapScreen';
import ProductDetailScreen from '@presentation/screens/ProductDetailScreen';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import LoginScreen from '@presentation/screens/LoginScreen';
import colors from '@presentation/styles/colors';
import { useHome } from '@presentation/context/HomeContext';
import type { HomeTabParamList, RootStackParamList } from './types';

const Tab = createMaterialTopTabNavigator<HomeTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const CustomTabBar = ({ state, descriptors, navigation }: MaterialTopTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(6, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const icon = options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? colors.primary : colors.textSoft,
        });

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
          >
            {icon}
            <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textSoft }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const Tabs = () => {
  const { t } = useHome();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        animationEnabled: true,
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
  const { isAuthenticated } = useHome();

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
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Tabs" component={Tabs} />
        )}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    paddingVertical: 6,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
