import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsRowItem } from '../SettingsRowItem';
import type { ToggleRow, LinkRow, RadioRow } from '../settingsTypes';

const baseStyles = new Proxy({}, { get: () => ({}) });
const baseTheme = { textSecondary: '#888', textDisabled: '#ccc' };
const baseToggleMap = {
  push: { value: true, setter: jest.fn() },
  email: { value: false, setter: jest.fn() },
};

describe('SettingsRowItem', () => {
  it('renders toggle row', () => {
    const row: ToggleRow = {
      kind: 'toggle',
      icon: 'notifications-outline',
      label: 'Push',
      key: 'push',
    };
    const { getByText } = render(
      <SettingsRowItem
        row={row}
        isLast={false}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    expect(getByText('Push')).toBeTruthy();
  });

  it('calls toggle setter on press', () => {
    const setter = jest.fn();
    const toggleMap = { push: { value: true, setter } };
    const row: ToggleRow = {
      kind: 'toggle',
      icon: 'notifications-outline',
      label: 'Push',
      key: 'push',
    };
    const { UNSAFE_getAllByType } = render(
      <SettingsRowItem
        row={row}
        isLast={false}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={toggleMap}
      />,
    );
    // The toggle is the last TouchableOpacity in the row
    const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    fireEvent.press(touchables[touchables.length - 1]);
    expect(setter).toHaveBeenCalledTimes(1);
  });

  it('renders link row with value and chevron', () => {
    const onPress = jest.fn();
    const row: LinkRow = {
      kind: 'link',
      icon: 'language-outline',
      label: 'Language',
      value: 'English',
      onPress,
    };
    const { getByText } = render(
      <SettingsRowItem
        row={row}
        isLast={true}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    expect(getByText('Language')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();
  });

  it('calls link onPress', () => {
    const onPress = jest.fn();
    const row: LinkRow = { kind: 'link', icon: 'language-outline', label: 'Language', onPress };
    const { getByText } = render(
      <SettingsRowItem
        row={row}
        isLast={false}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    fireEvent.press(getByText('Language'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders radio row with options', () => {
    const onSelect = jest.fn();
    const row: RadioRow = {
      kind: 'radio',
      icon: 'sunny-outline',
      label: 'Theme',
      options: [
        { key: 'light', label: 'Light' },
        { key: 'dark', label: 'Dark' },
      ],
      selected: 'dark',
      onSelect,
    };
    const { getByText } = render(
      <SettingsRowItem
        row={row}
        isLast={false}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    expect(getByText('Theme')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Dark')).toBeTruthy();
  });

  it('calls radio onSelect when option pressed', () => {
    const onSelect = jest.fn();
    const row: RadioRow = {
      kind: 'radio',
      icon: 'sunny-outline',
      label: 'Theme',
      options: [
        { key: 'light', label: 'Light' },
        { key: 'dark', label: 'Dark' },
      ],
      selected: 'dark',
      onSelect,
    };
    const { getByText } = render(
      <SettingsRowItem
        row={row}
        isLast={true}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    fireEvent.press(getByText('Light'));
    expect(onSelect).toHaveBeenCalledWith('light');
  });

  it('renders link row without value', () => {
    const row: LinkRow = { kind: 'link', icon: 'help-circle-outline', label: 'FAQ' };
    const { getByText, queryByText } = render(
      <SettingsRowItem
        row={row}
        isLast={false}
        styles={baseStyles}
        theme={baseTheme}
        toggleMap={baseToggleMap}
      />,
    );
    expect(getByText('FAQ')).toBeTruthy();
    expect(queryByText('English')).toBeNull();
  });
});
