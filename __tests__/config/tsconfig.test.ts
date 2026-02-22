import * as fs from 'fs';
import * as path from 'path';

describe('TypeScript Configuration', () => {
  const tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
  let tsconfig: Record<string, unknown>;

  beforeAll(() => {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    tsconfig = JSON.parse(raw);
  });

  it('extends expo/tsconfig.base', () => {
    expect(tsconfig.extends).toBe('expo/tsconfig.base');
  });

  it('has strict mode enabled', () => {
    const compilerOptions = tsconfig.compilerOptions as Record<string, unknown>;
    expect(compilerOptions.strict).toBe(true);
  });

  it('has path alias @/* -> src/*', () => {
    const compilerOptions = tsconfig.compilerOptions as Record<string, unknown>;
    const paths = compilerOptions.paths as Record<string, string[]>;
    expect(paths['@/*']).toEqual(['src/*']);
  });
});
