import type { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface ToggleRow {
  kind: 'toggle';
  icon: IconName;
  label: string;
  key: string;
}

export interface LinkRow {
  kind: 'link';
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}

export interface RadioRow {
  kind: 'radio';
  icon: IconName;
  label: string;
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}

export type SettingsRow = ToggleRow | LinkRow | RadioRow;

export interface Section {
  title: string;
  rows: SettingsRow[];
}
