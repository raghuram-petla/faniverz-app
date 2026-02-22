import * as fs from 'fs';
import * as path from 'path';

describe('EAS Configuration', () => {
  const easPath = path.resolve(__dirname, '../../eas.json');
  let easConfig: Record<string, unknown>;

  beforeAll(() => {
    const raw = fs.readFileSync(easPath, 'utf-8');
    easConfig = JSON.parse(raw);
  });

  it('has build profiles', () => {
    const build = easConfig.build as Record<string, unknown>;
    expect(build).toBeDefined();
    expect(build.development).toBeDefined();
    expect(build.preview).toBeDefined();
    expect(build.production).toBeDefined();
  });

  it('development profile has developmentClient', () => {
    const dev = (easConfig.build as Record<string, Record<string, unknown>>).development;
    expect(dev.developmentClient).toBe(true);
  });

  it('production profile has autoIncrement', () => {
    const prod = (easConfig.build as Record<string, Record<string, unknown>>).production;
    expect(prod.autoIncrement).toBe(true);
  });

  it('each profile has env vars', () => {
    const build = easConfig.build as Record<string, Record<string, unknown>>;
    ['development', 'preview', 'production'].forEach((profile) => {
      const env = build[profile].env as Record<string, string>;
      expect(env.EXPO_PUBLIC_SUPABASE_URL).toBeTruthy();
      expect(env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
    });
  });

  it('has submit configuration', () => {
    expect(easConfig.submit).toBeDefined();
  });
});
