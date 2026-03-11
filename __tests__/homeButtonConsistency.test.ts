import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../app');

/**
 * Patterns for files exempt from the home button requirement.
 * These are files that either don't render their own screen (layouts, redirects)
 * or are at the root of navigation (tab screens, auth entry points).
 */
const EXEMPT_PATTERNS = [
  '_layout.tsx',
  'components/',
  '__tests__/',
  '(tabs)/',
  '(auth)/login.tsx',
  '(auth)/register.tsx',
  'post/',
];

function isExempt(filePath: string): boolean {
  const relative = path.relative(APP_DIR, filePath);
  // app/index.tsx is a redirect, not a screen
  if (relative === 'index.tsx') return true;
  return EXEMPT_PATTERNS.some((pattern) => relative.includes(pattern));
}

function getAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllRouteFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Home button consistency', () => {
  const routeFiles = getAllRouteFiles(APP_DIR).filter((f) => !isExempt(f));

  it.each(routeFiles.map((f) => [path.relative(APP_DIR, f), f]))(
    '%s imports ScreenHeader, HomeButton, or MovieDetailHeader',
    (_label, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      const hasScreenHeader = content.includes('ScreenHeader');
      const hasHomeButton = content.includes('HomeButton');
      const hasMovieDetailHeader = content.includes('MovieDetailHeader');
      // Components that internally contain HomeButton
      const hasActorCollapsibleHeader = content.includes('ActorCollapsibleHeader');
      expect(
        hasScreenHeader || hasHomeButton || hasMovieDetailHeader || hasActorCollapsibleHeader,
      ).toBe(true);
    },
  );
});
