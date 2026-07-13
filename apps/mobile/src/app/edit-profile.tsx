import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { ProfileAvatar } from '@/components/common/profile-avatar';
import { useCustomAlert } from '@/components/ui/custom-alert';
import { useWorkplaceInfoBackfill } from '@/hooks/use-workplace-info';
import { joinBranches } from '@/lib/api/onboarding';
import { type UploadImageFile, uploadImage } from '@/lib/api/uploads';
import { updateMe } from '@/lib/api/users';
import { useAuthStore } from '@/stores/auth-store';
import {
  type WorkplaceDraft,
  useWorkplaceDraftStore,
} from '@/stores/workplace-draft-store';

const SCREEN_BG = '#FFFFFF';
const SECTION_BG = '#FFFFFF';
const DIVIDER = '#E5E7EB';
const TEXT = '#1C1C1E';
const MUTED = '#8E8E93';
const PROFILE_BUTTON_COLOR = '#1C252E';
const PROFILE_ICON_COLOR = '#141A21';
const PROFILE_ICON_BG = '#F1F2F4';
const CARD_RADIUS = 20;
const CARD_BORDER = Platform.select({ android: 'transparent', default: 'rgba(0,0,0,0.07)' });
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

type SelectedAvatar = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'fileName' | 'mimeType' | 'file'>;
type UpdateProfilePayload = { name: string; avatar_url?: string };
type UpdateProfileVariables = {
  data: UpdateProfilePayload;
  workplace: WorkplaceDraft | null;
};

function getAvatarFileName(asset: SelectedAvatar) {
  if (asset.fileName) return asset.fileName;
  if (asset.file?.name) return asset.file.name;

  const extension = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return `avatar-${Date.now()}.${extension}`;
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const workplaceDraft = useWorkplaceDraftStore((state) => state.draft);
  const setWorkplaceDraft = useWorkplaceDraftStore((state) => state.setDraft);
  const clearWorkplaceDraft = useWorkplaceDraftStore((state) => state.clearDraft);
  useWorkplaceInfoBackfill();
  const [name, setName] = useState(user?.fullName ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const savedPrimaryBranch = useMemo(() => {
    return user?.branches?.[0] ?? (
      user?.branchName || user?.branchAddress
        ? { id: user.branchId, name: user.branchName || 'Filial', address: user.branchAddress }
        : null
    );
  }, [user?.branchAddress, user?.branchId, user?.branchName, user?.branches]);

  const displayedCompanyName = workplaceDraft?.companyName || user?.companyName;
  const displayedPrimaryBranch = workplaceDraft?.branches[0] ?? savedPrimaryBranch;
  const workplaceChanged = useMemo(() => {
    if (!workplaceDraft || !user) return false;
    const savedBranchIds = user.branches.map((branch) => branch.id).sort().join(',');
    const draftBranchIds = workplaceDraft.branches.map((branch) => branch.id).sort().join(',');
    return workplaceDraft.companyId !== user.companyId || draftBranchIds !== savedBranchIds;
  }, [user, workplaceDraft]);

  const updateMutation = useMutation({
    mutationFn: async ({ data, workplace }: UpdateProfileVariables) => {
      const workplaceStatus = workplace
        ? await joinBranches(workplace.branches.map((branch) => branch.id))
        : null;
      const updatedUser = await updateMe(data);
      return { updatedUser, workplaceStatus };
    },
    onSuccess: ({ updatedUser, workplaceStatus }, variables) => {
      const primaryBranch = variables.workplace?.branches[0];
      updateUser({
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl ?? variables.data.avatar_url ?? user?.avatarUrl,
        ...(variables.workplace
          ? {
              accountStatus: workplaceStatus?.account_status ?? user?.accountStatus,
              companyId: workplaceStatus?.company_id ?? variables.workplace.companyId,
              companyName: variables.workplace.companyName,
              branchId: primaryBranch?.id ?? '',
              branchName: primaryBranch?.name ?? '',
              branchAddress: primaryBranch?.address ?? '',
              branches: variables.workplace.branches,
            }
          : {}),
      });
      if (variables.workplace) {
        void queryClient.invalidateQueries({ queryKey: ['employee-menu'] });
        void queryClient.invalidateQueries({ queryKey: ['workplace-info'] });
      }
      clearWorkplaceDraft();
      setSelectedAvatar(null);
      setIsUploadingAvatar(false);
      router.back();
    },
    onError: (error) => {
      setIsUploadingAvatar(false);
      showAlert('Xatolik', error instanceof Error ? error.message : 'Profil yangilanmadi');
    },
  });

  const isSaving = updateMutation.isPending || isUploadingAvatar;

  const openWorkplacePicker = () => {
    if (!workplaceDraft && user) {
      setWorkplaceDraft({
        companyId: user.companyId,
        companyName: user.companyName,
        branches: user.branches.length
          ? user.branches
          : savedPrimaryBranch
            ? [savedPrimaryBranch]
            : [],
      });
    }
    router.push({
      pathname: '/(onboarding)/companies',
      params: { returnTo: '/edit-profile' },
    });
  };

  const handleBack = useCallback(() => {
    clearWorkplaceDraft();
    router.back();
  }, [clearWorkplaceDraft]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  useEffect(() => () => clearWorkplaceDraft(), [clearWorkplaceDraft]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAlert('Ruxsat kerak', 'Profil rasmi tanlash uchun galereyaga ruxsat bering.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset?.uri) {
      setSelectedAvatar({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        file: asset.file,
      });
    }
  };

  const saveProfile = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      showAlert('Ism kiritilmadi', 'Ismingizni kiriting.');
      return;
    }

    const payload: UpdateProfilePayload = { name: normalizedName };

    try {
      if (selectedAvatar) {
        setIsUploadingAvatar(true);
        const fileName = getAvatarFileName(selectedAvatar);
        const uploadFile: UploadImageFile =
          selectedAvatar.file ??
          {
            uri: selectedAvatar.uri,
            name: fileName,
            type: selectedAvatar.mimeType ?? 'image/jpeg',
          };
        const uploadedImage = await uploadImage(uploadFile, 'avatars', fileName);
        if (!uploadedImage.url.startsWith('http://') && !uploadedImage.url.startsWith('https://')) {
          throw new Error("Upload javobi noto'g'ri URL qaytardi.");
        }
        payload.avatar_url = uploadedImage.url;
      }

      updateMutation.mutate({
        data: payload,
        workplace: workplaceChanged ? workplaceDraft : null,
      });
    } catch (error) {
      showAlert('Xatolik', error instanceof Error ? error.message : 'Rasm yuklanmadi');
      setIsUploadingAvatar(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SCREEN_BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <XStack
        position="absolute"
        top={insets.top + 10}
        left={16}
        right={16}
        zIndex={10}
        alignItems="center"
        justifyContent="space-between"
        pointerEvents="box-none"
      >
        <HeaderBackButton onPress={handleBack} />

        <YStack
          minWidth={74}
          height={38}
          borderRadius={19}
          paddingHorizontal={16}
          backgroundColor={PROFILE_BUTTON_COLOR}
          alignItems="center"
          justifyContent="center"
          opacity={isSaving ? 0.65 : 1}
          pressStyle={{ opacity: 0.65, scale: 0.98 }}
          onPress={isSaving ? undefined : saveProfile}
        >
          {isSaving ? (
            <Spinner color="#FFFFFF" size="small" />
          ) : (
            <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#FFFFFF">
              Tayyor
            </Text>
          )}
        </YStack>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: Math.max(insets.bottom + 24, 40),
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        <YStack gap={10}>
          <XStack
            backgroundColor={SECTION_BG}
            borderRadius={CARD_RADIUS}
            borderWidth={Platform.select({ android: 0, default: 0.5 })}
            borderColor={CARD_BORDER}
            padding={16}
            gap={12}
            alignItems="center"
            style={CARD_SHADOW}
          >
            <YStack pressStyle={{ opacity: 0.8 }} onPress={pickAvatar}>
              <ProfileAvatar
                name={name.trim() || user?.fullName || 'User'}
                avatarUrl={selectedAvatar?.uri ?? user?.avatarUrl}
                size={76}
              />
              <YStack
                position="absolute"
                inset={0}
                width={76}
                height={76}
                borderRadius={38}
                backgroundColor="rgba(0,0,0,0.24)"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
              </YStack>
            </YStack>

            <YStack flex={1}>
              <Input
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                placeholder="To'liq ism"
                color={TEXT}
                placeholderTextColor="$gray10"
                fontFamily="$body"
                fontSize={15}
                fontWeight="500"
                height={38}
                paddingHorizontal={0}
                borderWidth={0}
                backgroundColor="transparent"
                focusStyle={{ borderWidth: 0, outlineWidth: 0 }}
              />
              <YStack height={1} backgroundColor={DIVIDER} />
              <XStack height={38} alignItems="center">
                <Text fontFamily="$body" color={MUTED} fontSize={14}>
                  {user?.phone ?? ''}
                </Text>
              </XStack>
            </YStack>
          </XStack>

          <Text fontFamily="$body" color={MUTED} fontSize={12} lineHeight={18} paddingHorizontal={16}>
            Ismingizni kiriting va profil rasmini qo&apos;shing.
          </Text>
        </YStack>

        <YStack gap={12}>
          <Text fontFamily="$heading" color={MUTED} fontSize={12} fontWeight="700" paddingHorizontal={16}>
            ISH JOYI
          </Text>

          <YStack
            backgroundColor={SECTION_BG}
            borderRadius={CARD_RADIUS}
            borderWidth={Platform.select({ android: 0, default: 0.5 })}
            borderColor={CARD_BORDER}
            padding={16}
            style={CARD_SHADOW}
          >
            <XStack alignItems="center" gap={12} minHeight={44}>
              <YStack
                width={42}
                height={42}
                borderRadius={14}
                backgroundColor={PROFILE_ICON_BG}
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="business-outline" size={22} color={PROFILE_ICON_COLOR} />
              </YStack>
              <YStack flex={1} gap={3}>
                <Text fontFamily="$body" fontSize={15} fontWeight="700" color={TEXT}>
                  Kompaniya
                </Text>
                {displayedCompanyName ? (
                  <Text fontFamily="$body" fontSize={12} fontWeight="500" color={MUTED} numberOfLines={1}>
                    {displayedCompanyName}
                  </Text>
                ) : user?.companyId ? (
                  <Spinner color={PROFILE_BUTTON_COLOR} size="small" />
                ) : (
                  <Text fontFamily="$body" fontSize={12} fontWeight="500" color={MUTED} numberOfLines={1}>
                    Kompaniya tanlanmagan
                  </Text>
                )}
              </YStack>
            </XStack>
            <YStack height={1} backgroundColor={DIVIDER} marginVertical={12} />
            <XStack alignItems="center" gap={12} minHeight={44}>
              <YStack
                width={42}
                height={42}
                borderRadius={14}
                backgroundColor={PROFILE_ICON_BG}
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="location-outline" size={22} color={PROFILE_ICON_COLOR} />
              </YStack>
              <YStack flex={1} gap={3}>
                <Text fontFamily="$body" fontSize={15} fontWeight="700" color={TEXT}>
                  Filial
                </Text>
                <Text fontFamily="$body" fontSize={12} fontWeight="500" color={MUTED} numberOfLines={1}>
                  {displayedPrimaryBranch?.name || 'Filial tanlanmagan'}
                </Text>
              </YStack>
            </XStack>
            <YStack
              marginTop={14}
              minHeight={46}
              borderRadius={14}
              backgroundColor={PROFILE_BUTTON_COLOR}
              alignItems="center"
              justifyContent="center"
              paddingVertical={13}
              pressStyle={{ opacity: 0.7 }}
              onPress={openWorkplacePicker}
            >
              <Text fontFamily="$body" fontSize={14} fontWeight="700" color="#FFFFFF">
                {user?.companyId ? "Ish joyini o'zgartirish" : 'Kompaniya tanlash'}
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
