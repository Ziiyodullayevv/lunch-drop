import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, TextInput, TouchableOpacity, UIManager, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { listCompanies } from '@/lib/api/onboarding';
import type { CompanyWithBranchesDto as CompanyDto } from '@/lib/api/onboarding';

function CompanyItem({
  company,
  userName,
  returnTo,
}: {
  company: CompanyDto;
  userName: string;
  returnTo?: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(onboarding)/branches',
          params: { companyId: company.id, companyName: company.name, userName, returnTo },
        })
      }
    >
      <XStack
        backgroundColor="#F0F0F3"
        borderRadius={16}
        paddingHorizontal={16}
        paddingVertical={16}
        alignItems="center"
        justifyContent="space-between"
      >
        <YStack flex={1} gap={4}>
          <Text fontFamily="$heading" fontSize={16} fontWeight="700" color="#1C1C1E">
            {company.name}
          </Text>
          <Text fontFamily="$body" fontSize={13} color="#8E8E93" fontWeight="400">
            {company.branches.length > 0 ? `${company.branches.length} ta filial` : 'Filial mavjud emas'}
          </Text>
        </YStack>
        <Ionicons name="chevron-forward" size={17} color="#1C252E" style={{ marginLeft: 8 }} />
      </XStack>
    </TouchableOpacity>
  );
}

export default function CompaniesScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { userName = '', returnTo } = useLocalSearchParams<{ userName: string; returnTo?: string }>();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // horizontal padding + back button/gap + search button/gap
  const searchBarWidth = screenWidth - 32 - 46 - 46;
  const animWidth   = useSharedValue(0);
  const animOpacity = useSharedValue(0);
  const searchBarStyle = useAnimatedStyle(() => ({
    width:           animWidth.value,
    opacity:         animOpacity.value,
    overflow:        'hidden',
    marginRight:     8,
    height:          38,
    borderRadius:    14,
    backgroundColor: '#F0F0F3',
    justifyContent:  'center' as const,
  }));

  // Android uchun LayoutAnimation ni yoqish
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const layoutAnim = useMemo(() => LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'), []);

  const { data: companies, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding-companies'],
    queryFn: listCompanies,
  });

  const filtered = (companies ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const timing = useMemo(() => ({ duration: 300, easing: Easing.out(Easing.cubic) }), []);

  const openSearch = () => {
    LayoutAnimation.configureNext(layoutAnim);
    setSearchOpen(true);
    animWidth.value   = withTiming(searchBarWidth, timing);
    animOpacity.value = withTiming(1, { duration: 200 });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = useCallback(() => {
    LayoutAnimation.configureNext(layoutAnim);
    setSearchOpen(false);
    animWidth.value   = withTiming(0, timing);
    animOpacity.value = withTiming(0, { duration: 150 });
    setQuery('');
    inputRef.current?.blur();
  }, [animOpacity, animWidth, layoutAnim, timing]);

  useFocusEffect(
    useCallback(() => {
      return () => closeSearch();
    }, [closeSearch])
  );

  const handleBack = useCallback(() => {
    if (returnTo) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/(onboarding)/set-name',
      params: { allowEdit: '1' },
    });
  }, [returnTo]);

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>

      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={8}
        alignItems="center"
        justifyContent="space-between"
        height={54}
      >
        <HeaderBackButton onPress={handleBack} />

        <Animated.View style={searchBarStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
            <MaterialCommunityIcons name="magnify" size={18} color="#8E8E93" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Kompaniya nomi..."
              placeholderTextColor="#C7C7CC"
              style={{ flex: 1, fontSize: 15, fontFamily: 'NunitoSans_400Regular', color: '#1C1C1E', padding: 0 }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </Animated.View>

        {/* Search / Close icon */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={searchOpen ? closeSearch : openSearch}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#F0F0F3',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name={searchOpen ? 'close' : 'magnify'}
            size={20}
            color="#1C1C1E"
          />
        </TouchableOpacity>
      </XStack>

      {/* Title — LayoutAnimation bilan silliq yashiriladi */}
      {!searchOpen && (
        <YStack paddingHorizontal={20} paddingTop={24} gap={4}>
          <Text fontFamily="$heading" fontSize={34} fontWeight="800" color="#1C1C1E" lineHeight={40} letterSpacing={-0.5}>
            Kompaniya
          </Text>
          <Text fontFamily="$body" fontSize={15} color="#8E8E93" fontWeight="400">
            Qaysi kompaniyada ishlaysiz?
          </Text>
        </YStack>
      )}

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: searchOpen ? 8 : 24,
          paddingBottom: Math.max(insets.bottom + 16, 36),
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && (
          <YStack alignItems="center" paddingVertical={32}>
            <Spinner color="#00A76F" size="large" />
          </YStack>
        )}

        {error && (
          <YStack
            backgroundColor="#FFF0EE"
            borderRadius={16}
            padding={16}
            gap={12}
            alignItems="center"
          >
            <Text fontFamily="$body" fontSize={15} color="#FF3B30" fontWeight="600" textAlign="center">
              Kompaniyalar yuklanmadi
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => refetch()}
              style={{
                backgroundColor: '#1C1C1E',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="#FFFFFF">Qayta urinish</Text>
            </TouchableOpacity>
          </YStack>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <YStack alignItems="center" paddingVertical={32} gap={8}>
            <MaterialCommunityIcons name="magnify" size={36} color="#C7C7CC" />
            <Text fontFamily="$body" fontSize={15} color="#8E8E93" textAlign="center">
              {query ? `"${query}" topilmadi` : 'Hozircha kompaniyalar yo\'q'}
            </Text>
          </YStack>
        )}

        {filtered.map((c) => (
          <CompanyItem key={c.id} company={c} userName={userName} returnTo={returnTo} />
        ))}
      </ScrollView>
    </YStack>
  );
}
