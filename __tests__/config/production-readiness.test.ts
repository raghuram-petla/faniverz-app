import * as fs from 'fs';
import * as path from 'path';

describe('Production Readiness', () => {
  it('app.json has valid bundle identifiers', () => {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf-8'));
    const expo = appJson.expo;
    expect(expo.ios.bundleIdentifier).toBe('com.faniverz.app');
    expect(expo.android.package).toBe('com.faniverz.app');
  });

  it('app.json has version set', () => {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf-8'));
    expect(appJson.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('app.json has scheme for deep linking', () => {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf-8'));
    expect(appJson.expo.scheme).toBe('faniverz');
  });

  it('no service role key in client code', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const appDir = path.resolve(__dirname, '../../app');

    function searchFiles(dir: string): boolean {
      if (!fs.existsSync(dir)) return false;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          if (searchFiles(fullPath)) return true;
        } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) return true;
          if (content.includes('service_role')) return true;
        }
      }
      return false;
    }

    expect(searchFiles(srcDir)).toBe(false);
    expect(searchFiles(appDir)).toBe(false);
  });

  it('.env.example exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../.env.example'))).toBe(true);
  });
});
