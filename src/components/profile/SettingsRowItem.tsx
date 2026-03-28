/**
 * @contract Renders a single settings row — toggle, radio, or link.
 * Extracted from settings.tsx to keep the route file under 300 lines.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsRow } from './settingsTypes';

export interface SettingsRowItemProps {
  row: SettingsRow;
  isLast: boolean;
  styles: Record<string, unknown>;
  theme: { textSecondary: string; textDisabled: string };
  toggleMap: Record<string, { value: boolean; setter: () => void }>;
}

export function SettingsRowItem({ row, isLast, styles, theme, toggleMap }: SettingsRowItemProps) {
  const s = styles as Record<string, Record<string, unknown>>;

  if (row.kind === 'toggle') {
    const toggle = toggleMap[row.key];
    // @edge: guard against missing key — prevents crash if toggleMap and section rows are out of sync
    if (!toggle) return null;
    return (
      <View style={[s.row, !isLast && s.rowBorder]}>
        <View style={s.rowLeft}>
          <View style={s.iconWrapper}>
            <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
          </View>
          <Text style={s.rowLabel}>{row.label}</Text>
        </View>
        <TouchableOpacity
          onPress={toggle.setter}
          activeOpacity={0.8}
          style={[s.toggle, toggle.value ? s.toggleOn : s.toggleOff]}
        >
          <View style={[s.toggleThumb, toggle.value ? s.toggleThumbOn : s.toggleThumbOff]} />
        </TouchableOpacity>
      </View>
    );
  }

  if (row.kind === 'radio') {
    return (
      <View style={[s.radioRow, !isLast && s.rowBorder]}>
        <View style={s.radioHeader}>
          <View style={s.iconWrapper}>
            <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
          </View>
          <Text style={s.rowLabel}>{row.label}</Text>
        </View>
        <View style={s.radioOptions}>
          {row.options.map((opt) => {
            const isSelected = opt.key === row.selected;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.radioChip, isSelected && s.radioChipSelected]}
                activeOpacity={1}
                onPress={() => row.onSelect(opt.key)}
              >
                <Text style={[s.radioChipText, isSelected && s.radioChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[s.row, !isLast && s.rowBorder]}
      activeOpacity={0.7}
      onPress={row.onPress}
    >
      <View style={s.rowLeft}>
        <View style={s.iconWrapper}>
          <Ionicons name={row.icon} size={18} color={theme.textSecondary} />
        </View>
        <Text style={s.rowLabel}>{row.label}</Text>
      </View>
      <View style={s.rowRight}>
        {row.value ? <Text style={s.rowValue}>{row.value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={theme.textDisabled} />
      </View>
    </TouchableOpacity>
  );
}
