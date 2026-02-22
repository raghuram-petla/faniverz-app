import * as fs from 'fs';
import * as path from 'path';

describe('Lint Configuration', () => {
  it('eslint.config.js exists', () => {
    const configPath = path.resolve(__dirname, '../../eslint.config.js');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('.prettierrc exists', () => {
    const configPath = path.resolve(__dirname, '../../.prettierrc');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('.prettierrc has correct settings', () => {
    const configPath = path.resolve(__dirname, '../../.prettierrc');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.semi).toBe(true);
    expect(config.singleQuote).toBe(true);
    expect(config.tabWidth).toBe(2);
    expect(config.trailingComma).toBe('es5');
    expect(config.printWidth).toBe(100);
  });

  it('.husky/pre-commit exists and runs lint-staged', () => {
    const hookPath = path.resolve(__dirname, '../../.husky/pre-commit');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('lint-staged');
  });

  it('package.json has lint-staged config for ts/tsx files', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const lintStaged = pkg['lint-staged'] as Record<string, string[]>;
    expect(lintStaged['*.{ts,tsx}']).toBeDefined();
    expect(lintStaged['*.{ts,tsx}']).toContain('eslint --fix');
    expect(lintStaged['*.{ts,tsx}']).toContain('prettier --write');
  });

  it('package.json has lint, typecheck, and test scripts', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts.lint).toBeDefined();
    expect(scripts['lint:fix']).toBeDefined();
    expect(scripts.typecheck).toBeDefined();
    expect(scripts.test).toBeDefined();
    expect(scripts['test:watch']).toBeDefined();
    expect(scripts.prepare).toBeDefined();
  });
});
