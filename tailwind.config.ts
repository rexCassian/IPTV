import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                dark: {
                    50: '#e6e7eb',
                    100: '#c0c2cc',
                    200: '#999dab',
                    300: '#73788a',
                    400: '#565c72',
                    500: '#3a405a',
                    600: '#343a52',
                    700: '#2c3148',
                    800: '#24293e',
                    900: '#171b2e',
                    950: '#0a0d1a',
                },
                accent: {
                    50: '#e8f5ff',
                    100: '#c5e4ff',
                    200: '#9dd3ff',
                    300: '#72c1ff',
                    400: '#4fb3ff',
                    500: '#2ea5ff',
                    600: '#2897f0',
                    700: '#1e84dc',
                    800: '#1873c9',
                    900: '#0a54a8',
                },
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-right': 'slideRight 0.3s ease-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
                shimmer: 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideRight: {
                    '0%': { transform: 'translateX(-10px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(46, 165, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(46, 165, 255, 0.6)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};

export default config;
