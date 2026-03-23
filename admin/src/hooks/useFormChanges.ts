import { useMemo } from 'react';

// @contract Field type determines how old/new values are formatted in the dock
export type FieldType = 'text' | 'date' | 'boolean' | 'select' | 'image' | 'number';

// @contract Each field config defines how to display and format a field's changes
export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  /** @nullable For select fields: maps raw value to display label */
  options?: Record<string, string>;
}

// @contract A single detected change with display-ready values
export interface FieldChange {
  key: string;
  label: string;
  type: FieldType;
  oldValue: unknown;
  newValue: unknown;
  oldDisplay: string;
  newDisplay: string;
}

export interface UseFormChangesReturn {
  changes: FieldChange[];
  isDirty: boolean;
  changeCount: number;
}

function formatValue(value: unknown, type: FieldType, options?: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return '(empty)';

  switch (type) {
    case 'boolean':
      return value === true || value === 'true' ? 'Yes' : 'No';
    case 'date': {
      const d = new Date(value as string);
      return isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    case 'select':
      return options?.[String(value)] ?? String(value);
    case 'image': {
      const url = String(value);
      const segments = url.split('/');
      const filename = segments[segments.length - 1];
      return filename.length > 30 ? `${filename.slice(0, 27)}...` : filename;
    }
    case 'number':
      return String(value);
    default:
      return String(value);
  }
}

// @contract Diffs initial vs current form values and returns display-ready changes
export function useFormChanges(
  fields: FieldConfig[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialValues: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentValues: Record<string, any>,
): UseFormChangesReturn {
  const changes = useMemo(() => {
    if (!initialValues) return [];
    const result: FieldChange[] = [];
    for (const field of fields) {
      const oldVal = initialValues[field.key];
      const newVal = currentValues[field.key];
      // @edge String coercion means 0 !== '' is a change, but null === undefined (both become '')
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        result.push({
          key: field.key,
          label: field.label,
          type: field.type,
          oldValue: oldVal,
          newValue: newVal,
          oldDisplay: formatValue(oldVal, field.type, field.options),
          newDisplay: formatValue(newVal, field.type, field.options),
        });
      }
    }
    return result;
  }, [fields, initialValues, currentValues]);

  return { changes, isDirty: changes.length > 0, changeCount: changes.length };
}
