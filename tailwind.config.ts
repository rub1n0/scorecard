import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                border: 'rgba(255, 255, 255, 0.1)',
                'sky-surge': {
                    50: '#e8f6fc',
                    100: '#d2edf9',
                    200: '#a4dcf4',
                    300: '#77caee',
                    400: '#49b9e9',
                    500: '#1ca7e3',
                    600: '#1686b6',
                    700: '#116488',
                    800: '#0b435b',
                    900: '#06212d',
                    950: '#041720',
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};

export default config;
