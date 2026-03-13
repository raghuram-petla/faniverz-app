import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { colors as palette } from '@shared/colors';
import { Actor } from '@/types';
import { getImageUrl, ImageSize } from '@shared/imageUrl';

function photoVariant(displaySize: number): ImageSize {
  if (displaySize <= 80) return 'sm';
  if (displaySize <= 160) return 'md';
  return 'lg';
}

// TMDB gender encoding
const GENDER_FEMALE = 1;
const GENDER_MALE = 2;

function isMinor(birthDate: string): boolean {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age < 18;
}

type AvatarConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  bgKey: 'default' | 'female' | 'minorMale' | 'minorFemale';
};

function resolveConfig(actor: Actor | undefined): AvatarConfig {
  const gender = actor?.gender ?? 0;
  const minor = actor?.birth_date ? isMinor(actor.birth_date) : false;

  if (!minor) {
    if (gender === GENDER_MALE) return { icon: 'man-outline', bgKey: 'default' };
    if (gender === GENDER_FEMALE) return { icon: 'woman-outline', bgKey: 'female' };
    return { icon: 'person-outline', bgKey: 'default' };
  } else {
    if (gender === GENDER_MALE) return { icon: 'person-outline', bgKey: 'minorMale' };
    if (gender === GENDER_FEMALE) return { icon: 'person-outline', bgKey: 'minorFemale' };
    return { icon: 'person-outline', bgKey: 'default' };
  }
}

function resolveBgColor(bgKey: AvatarConfig['bgKey'], isDark: boolean): string {
  const entry = palette.avatar[bgKey];
  return isDark ? entry.dark : entry.light;
}

interface Props {
  actor: Actor | undefined;
  size?: number;
}

export function ActorAvatar({ actor, size = 64 }: Props) {
  const { colors, isDark } = useTheme();

  if (actor?.photo_url) {
    return (
      <Image
        source={{ uri: getImageUrl(actor.photo_url, photoVariant(size)) ?? PLACEHOLDER_AVATAR }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  const { icon, bgKey } = resolveConfig(actor);
  const bg = resolveBgColor(bgKey, isDark);
  const minor = actor?.birth_date ? isMinor(actor.birth_date) : false;
  const iconSize = Math.round(size * (minor ? 0.42 : 0.5));
  const iconColor = isDark ? colors.white50 : colors.black50;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </View>
  );
}
