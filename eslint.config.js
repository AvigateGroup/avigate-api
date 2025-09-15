// eslint.config.js
export default [
    {
        ignores: ['node_modules/**'],
    },
    {
        languageOptions: {
            ecmaVersion: 12,
            sourceType: 'module',
        },
        rules: {
            'no-console': 'error',
        },
        plugins: ['prettier'],
        env: {
            es2021: true,
            node: true,
        },
    },
]
