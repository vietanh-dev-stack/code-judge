// Cấu hình ESLint dạng flat config (ESLint 9+) cho toàn monorepo.
// - Bỏ qua thư mục build và dependencies.
// - Áp dụng gợi ý TypeScript cho *.ts / *.tsx.

import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'ci/**',
      'scripts/**',
      'ecosystem.config.cjs',
      'deploy/**',
      // Next/PostCSS config dùng CommonJS (`module.exports`) — bỏ qua ESLint mặc định browser.
      '**/next.config.js',
      '**/postcss.config.js',
      // File do Next tự sinh, có triple-slash reference.
      '**/next-env.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Base: có thể siết dần theo nhu cầu team (chưa bật type-aware để tránh phức tạp monorepo).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
