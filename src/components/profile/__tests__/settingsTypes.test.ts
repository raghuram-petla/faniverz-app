import type { Section, SettingsRow, ToggleRow, IconName } from '../settingsTypes';

type LinkRow = Extract<SettingsRow, { kind: 'link' }>;
type RadioRow = Extract<SettingsRow, { kind: 'radio' }>;

describe('settingsTypes', () => {
  it('ToggleRow type is constructable', () => {
    const row: ToggleRow = {
      kind: 'toggle',
      icon: 'sparkles-outline' as IconName,
      label: 'Animations',
      key: 'animations',
    };
    expect(row.kind).toBe('toggle');
    expect(row.key).toBe('animations');
  });

  it('LinkRow type is constructable', () => {
    const row: LinkRow = {
      kind: 'link',
      icon: 'help-circle-outline' as IconName,
      label: 'Help',
      value: 'v1',
    };
    expect(row.kind).toBe('link');
    expect(row.value).toBe('v1');
  });

  it('RadioRow type is constructable', () => {
    const row: RadioRow = {
      kind: 'radio',
      icon: 'sunny-outline' as IconName,
      label: 'Theme',
      options: [{ key: 'dark', label: 'Dark' }],
      selected: 'dark',
      onSelect: jest.fn(),
    };
    expect(row.kind).toBe('radio');
    expect(row.options).toHaveLength(1);
  });

  it('SettingsRow union accepts all row kinds', () => {
    const rows: SettingsRow[] = [
      { kind: 'toggle', icon: 'sparkles-outline' as IconName, label: 'A', key: 'a' },
      { kind: 'link', icon: 'help-circle-outline' as IconName, label: 'B' },
      {
        kind: 'radio',
        icon: 'sunny-outline' as IconName,
        label: 'C',
        options: [],
        selected: '',
        onSelect: jest.fn(),
      },
    ];
    expect(rows).toHaveLength(3);
  });

  it('Section type groups rows with a title', () => {
    const section: Section = {
      title: 'Appearance',
      rows: [
        { kind: 'toggle', icon: 'sparkles-outline' as IconName, label: 'Animations', key: 'anims' },
      ],
    };
    expect(section.title).toBe('Appearance');
    expect(section.rows).toHaveLength(1);
  });
});
