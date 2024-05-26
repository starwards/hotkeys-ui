import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom', // consider instead, using browser : https://vitest.dev/config/#browser
    },
});
