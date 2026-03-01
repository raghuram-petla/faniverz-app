import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Actor } from '@/types';

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
  bg: string;
};

function resolveConfig(actor: Actor | undefined): AvatarConfig {
  const gender = actor?.gender ?? 0;
  const minor = actor?.birth_date ? isMinor(actor.birth_date) : false;

  if (!minor) {
    // Adults
    if (gender === GENDER_MALE) return { icon: 'man-outline', bg: '#27272A' }; // zinc-800
    if (gender === GENDER_FEMALE) return { icon: 'woman-outline', bg: '#2D1F3A' }; // dark purple
    return { icon: 'person-outline', bg: '#27272A' }; // unknown
  } else {
    // Minors — differentiated by background colour; slightly smaller icon handled via size prop
    if (gender === GENDER_MALE) return { icon: 'person-outline', bg: '#1A2F46' }; // dark blue
    if (gender === GENDER_FEMALE) return { icon: 'person-outline', bg: '#46151F' }; // dark rose
    return { icon: 'person-outline', bg: '#27272A' }; // unknown minor
  }
}

interface Props {
  actor: Actor | undefined;
  size?: number;
}

export function ActorAvatar({ actor, size = 64 }: Props) {
  if (actor?.photo_url) {
    return (
      <Image
        source={{ uri: actor.photo_url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  const { icon, bg } = resolveConfig(actor);
  const minor = actor?.birth_date ? isMinor(actor.birth_date) : false;
  // Minors get a slightly smaller icon to hint at smaller stature
  const iconSize = Math.round(size * (minor ? 0.42 : 0.5));

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
      <Ionicons name={icon} size={iconSize} color="rgba(255,255,255,0.5)" />
    </View>
  );
}
