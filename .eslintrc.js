module.exports = {
    extends: ['standard-with-typescript', 'prettier'],
    plugins: ['@effect'],
    parserOptions: {
        project: './tsconfig.json',
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/strict-boolean-expressions': 'off',
                '@typescript-eslint/restrict-template-expressions': 'off',
                // Effect-TS compatibility - Effect.gen returns Effect, not Promise
                '@typescript-eslint/promise-function-async': 'off',
            },
        },
    ],
    rules: {
        '@effect/no-import-from-barrel-package': 'error',
    },
};
