import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, router } from 'expo-router';
import { Image, Platform, TouchableOpacity, useColorScheme, View } from 'react-native';

import { ActiveOrderBar } from '@/components/order/active-order-bar';
import { Colors, DANGER } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useActiveOrder } from '@/hooks/use-orders';
import { useCartStore } from '@/stores/cart-store';

function OrdersTabIcon({ color }: { color: string }) {
  const cartItems = useCartStore((s) => s.items);
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../../../assets/images/tabIcons/shopping-bag.png')}
        style={{ width: 28, height: 28, tintColor: color }}
        resizeMode="contain"
      />
      {cartItems.length > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: DANGER,
          }} />
        </View>
      )}
    </View>
  );
}

function CustomTabBar(props: React.ComponentProps<typeof BottomTabBar>) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { activeOrder } = useActiveOrder();
  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: activeOrder ? 44 : 0,
      borderTopRightRadius: activeOrder ? 44 : 0,
      backgroundColor: colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: activeOrder ? 0.05 : 0,
      shadowRadius: activeOrder ? 8 : 0,
      boxShadow: activeOrder ? '0px -3px 8px rgba(0,0,0,0.045)' : 'none',
      elevation: 0,
    }}>
      <View style={{
        backgroundColor: colors.background,
        borderTopLeftRadius: activeOrder ? 36 : 0,
        borderTopRightRadius: activeOrder ? 36 : 0,
        borderTopWidth: activeOrder ? 0 : 0.5,
        borderTopColor: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <ActiveOrderBar />
        <BottomTabBar
          {...props}
          style={[props.style, {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            elevation: 0,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
          }]}
        />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const auth = useAuth();

  if (auth.hasHydrated && !auth.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const activeColor = isDark ? '#FFFFFF' : '#1C252E';
  const inactiveColor = isDark ? '#5C5F66' : '#B4B7BD';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? -2 : 0,
        },
        tabBarItemStyle: {
          paddingTop: Platform.OS === 'android' ? 6 : 10,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Bosh sahifa',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../../../assets/images/tabIcons/chef-hat.png')}
              style={{ width: 28, height: 28, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Buyurtmalar',
          tabBarIcon: ({ color }) => <OrdersTabIcon color={color} />,
          tabBarButton: (props) => (
            <TouchableOpacity
              style={props.style as any}
              onPress={() => router.push('/my-orders')}
              accessibilityRole="button"
              accessibilityLabel="Buyurtmalar"
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../../../assets/images/tabIcons/people.png')}
              style={{ width: 34, height: 34, tintColor: color }}
              resizeMode="contain"
            />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              style={props.style as any}
              onPress={() => router.push('/account')}
              accessibilityRole="button"
              accessibilityLabel="Profil"
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen name="favorites" options={{ href: null }} />
    </Tabs>
  );
}
