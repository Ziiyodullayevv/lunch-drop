import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { useCustomAlert } from '@/components/ui/custom-alert';
import { mapBranchInfo } from '@/lib/api/mappers';
import { listCompanyBranches, joinBranches, getEmployeeStatus } from '@/lib/api/onboarding';
import { openSupportBot } from '@/lib/support';
import type { CompanyBranchDto as BranchDto } from '@/lib/api/onboarding';
import { useAuthStore } from '@/stores/auth-store';

const ACCENT = '#00A76F';

function BranchItem({
  branch,
  selected,
  onToggle,
  disabled,
}: {
  branch: BranchDto;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={disabled ? undefined : onToggle}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <XStack
        backgroundColor="#F0F0F3"
        borderRadius={16}
        paddingHorizontal={16}
        paddingVertical={16}
        alignItems="center"
        gap={12}
      >
        {/* Checkbox */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: selected ? '#5BE49B' : '#C7C7CC',
            backgroundColor: selected ? '#5BE49B' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <Text fontFamily="$heading" color="#1C1C1E" fontSize={14} fontWeight="800" lineHeight={16}>
              ✓
            </Text>
          )}
        </View>

        {/* Info */}
        <YStack flex={1} gap={2}>
          <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#1C1C1E">
            {branch.name}
          </Text>
          {branch.address ? (
            <Text fontFamily="$body" fontSize={13} color="#8E8E93" fontWeight="400">
              {branch.address}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </TouchableOpacity>
  );
}

export default function BranchesScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const { companyId, companyName, returnTo } = useLocalSearchParams<{
    companyId: string;
    companyName: string;
    returnTo?: string;
  }>();

  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const currentUser = useAuthStore((s) => s.user);

  const isCurrentCompany = Boolean(companyId && currentUser?.companyId === companyId);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(isCurrentCompany ? (currentUser?.branches ?? []).map((b) => b.id) : [])
  );
  const queryClient = useQueryClient();
  const finishRoute = (returnTo || '/(tabs)/home') as Href;
  const resolvedCompanyName = companyName?.trim() || currentUser?.companyName || '';

  const { data: branches, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding-branches', companyId],
    queryFn: () => listCompanyBranches(companyId!),
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    setSelected(new Set(isCurrentCompany ? (currentUser?.branches ?? []).map((b) => b.id) : []));
  }, [currentUser?.branches, isCurrentCompany]);

  const availableBranchIds = useMemo(() => new Set((branches ?? []).map((b) => b.id)), [branches]);
  const selectedBranchIds = useMemo(
    () => Array.from(selected).filter((id) => availableBranchIds.has(id)),
    [availableBranchIds, selected]
  );

  const applySession = async (nextCompanyId?: string | null) => {
    if (!currentUser) return;
    const status = await getEmployeeStatus();
    const mappedBranches = (status.branches ?? []).map(mapBranchInfo);
    const primaryBranch = mappedBranches[0];
    setSession({
      accessToken: accessToken!,
      refreshToken: refreshToken!,
      user: {
        ...currentUser,
        branchId: primaryBranch?.id ?? '',
        branchName: primaryBranch?.name ?? '',
        branchAddress: primaryBranch?.address ?? '',
        companyId: nextCompanyId ?? status.company_id ?? companyId ?? currentUser.companyId,
        companyName: resolvedCompanyName,
        branches: mappedBranches,
      },
    });
  };

  const joinMutation = useMutation({
    mutationFn: (branchIds: string[]) => joinBranches(branchIds),
    onSuccess: async (status) => {
      if (currentUser) {
        const selectedBranches = (branches ?? [])
          .filter((b) => selectedBranchIds.includes(b.id))
          .map((b) => mapBranchInfo(b));
        const primaryBranch = selectedBranches[0];
        // account_status ni serverdan olamiz — re-join pending_approval qaytarishi mumkin
        const newAccountStatus = status.account_status ?? currentUser.accountStatus;
        setSession({
          accessToken: accessToken!,
          refreshToken: refreshToken!,
          user: {
            ...currentUser,
            accountStatus: newAccountStatus,
            branchId: primaryBranch?.id ?? '',
            branchName: primaryBranch?.name ?? '',
            branchAddress: primaryBranch?.address ?? '',
            companyId: status.company_id ?? companyId ?? currentUser.companyId,
            companyName: resolvedCompanyName,
            branches: selectedBranches,
          },
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['employee-menu'] });
      router.replace(finishRoute);
    },
    onError: async (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Filialga qo'shilishda xatolik yuz berdi.";
      // 500 xatosi — backend "already joined" holatini noto'g'ri handle qiladi.
      // Har qanday server xatosida statusni tekshirib, agar qo'shilgan bo'lsa home ga o'tamiz.
      try {
        await applySession();
        const status = await getEmployeeStatus();
        if (status.account_status !== 'rejected' && status.account_status !== 'inactive') {
          void queryClient.invalidateQueries({ queryKey: ['employee-menu'] });
          router.replace(finishRoute);
          return;
        }
      } catch {
        // getEmployeeStatus ham xato bersa — original xatoni ko'rsatamiz
      }
      showAlert('Xatolik', msg);
    },
  });

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedBranchIds.length === 0) return;

    const existingIds = new Set((currentUser?.branches ?? []).map((b) => b.id));
    const newBranchIds = selectedBranchIds.filter((id) => !existingIds.has(id));

    if (newBranchIds.length === 0) {
      // Faqat tanlash o'zgardi, yangi branch yo'q — API chaqirmay store yangilaymiz
      if (currentUser) {
        const selectedBranches = (branches ?? [])
          .filter((b) => selectedBranchIds.includes(b.id))
          .map((b) => mapBranchInfo(b));
        const primaryBranch = selectedBranches[0];
        setSession({
          accessToken: accessToken!,
          refreshToken: refreshToken!,
          user: {
            ...currentUser,
            branchId: primaryBranch?.id ?? '',
            branchName: primaryBranch?.name ?? '',
            branchAddress: primaryBranch?.address ?? '',
            companyId: companyId ?? currentUser.companyId,
            companyName: resolvedCompanyName,
            branches: selectedBranches,
          },
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['employee-menu'] });
      router.replace(finishRoute);
      return;
    }

    // Faqat yangi branchlarni yuboramiz — mavjudlarini qayta yuborsa backend 500 beradi
    joinMutation.mutate(newBranchIds);
  };

  const isPending = joinMutation.isPending;

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>

      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={8}
        alignItems="center"
        justifyContent="space-between"
      >
        <HeaderBackButton />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => void openSupportBot()}
          style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
            backgroundColor: '#F0F0F3',
          }}
        >
          <Text fontFamily="$heading" fontSize={13} fontWeight="600" color="#1C1C1E">Yordam</Text>
        </TouchableOpacity>
      </XStack>

      {/* Title */}
      <YStack paddingHorizontal={20} paddingTop={24} gap={4}>
        <Text fontFamily="$heading" fontSize={34} fontWeight="800" color="#1C1C1E" lineHeight={40} letterSpacing={-0.5}>
          {resolvedCompanyName || 'Filiallar'}
        </Text>
        <Text fontFamily="$body" fontSize={15} color="#8E8E93" fontWeight="400">
          Qaysi filiallarda ishlaysiz? Bir yoki bir nechta tanlang.
        </Text>
      </YStack>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom + 100, 120),
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
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
              Filiallar yuklanmadi
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => refetch()}
              style={{
                backgroundColor: '#1C1C1E', borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 8,
              }}
            >
              <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="#FFFFFF">Qayta urinish</Text>
            </TouchableOpacity>
          </YStack>
        )}

        {!isLoading && !error && (branches ?? []).length === 0 && (
          <YStack alignItems="center" paddingVertical={32}>
            <Text fontFamily="$body" fontSize={15} color="#8E8E93" textAlign="center">
              Filial mavjud emas
            </Text>
          </YStack>
        )}

        {(branches ?? []).map((b) => (
          <BranchItem
            key={b.id}
            branch={b}
            selected={selected.has(b.id)}
            onToggle={() => handleToggle(b.id)}
            disabled={isPending}
          />
        ))}
      </ScrollView>

      {/* Sticky confirm button */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 12, 24),
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(0,0,0,0.07)',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleConfirm}
          disabled={selectedBranchIds.length === 0 || isPending}
          style={{
            height: 56,
            borderRadius: 20,
            backgroundColor: selectedBranchIds.length === 0 ? '#E5E5EA' : ACCENT,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {selectedBranchIds.length === 0 ? (
            <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#8E8E93">
              Filial tanlang
            </Text>
          ) : (
            isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#FFFFFF">
                Tasdiqlash
              </Text>
            )
          )}
        </TouchableOpacity>
      </View>
    </YStack>
  );
}
