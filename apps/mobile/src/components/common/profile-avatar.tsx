import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, YStack } from 'tamagui';

import { getImagePreviewUrl } from '@/lib/image-url';
import { initials } from '@/lib/utils';

type ProfileAvatarProps = {
  name: string;
  size?: number;
  avatarUrl?: string;
};

export function ProfileAvatar({ name, size = 64, avatarUrl }: ProfileAvatarProps) {
  const previewUrl = getImagePreviewUrl(avatarUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);

  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      backgroundColor="#1C1C1E"
    >
      {previewUrl && !hasImageError ? (
        <Image
          source={{ uri: previewUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <Text fontFamily="$heading" color="#FFFFFF" fontSize={size / 3} fontWeight="700">
          {initials(name)}
        </Text>
      )}
    </YStack>
  );
}
