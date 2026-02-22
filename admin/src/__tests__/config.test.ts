import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Admin project configuration', () => {
  const root = path.resolve(__dirname, '../..');

  it('should have tsconfig with strict mode', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have path aliases configured', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.paths['@/*']).toContain('./src/*');
  });

  it('should have required scripts in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
    expect(pkg.scripts.typecheck).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts['test:e2e']).toBeDefined();
  });

  it('should have required dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.dependencies['next']).toBeDefined();
    expect(pkg.dependencies['react']).toBeDefined();
    expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();
    expect(pkg.dependencies['@tanstack/react-query']).toBeDefined();
    expect(pkg.dependencies['@tanstack/react-table']).toBeDefined();
    expect(pkg.dependencies['react-hook-form']).toBeDefined();
    expect(pkg.dependencies['zod']).toBeDefined();
    expect(pkg.dependencies['recharts']).toBeDefined();
  });

  it('should have .env.example with required vars', () => {
    const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf-8');
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
