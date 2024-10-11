import type { Config } from "tailwindcss";

const config = {
	important: true,
	darkMode: "class",
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			typography: ({ theme }: { theme: (path: string) => string }) => ({
				default: {
					css: {
						"--tw-prose-body": "hsl(var(--foreground) / 0.9)",
						"--tw-prose-headings": "hsl(var(--foreground))",
						"--tw-prose-lead": "hsl(var(--foreground) / 0.8)",
						"--tw-prose-links": "hsl(var(--foreground))",
						"--tw-prose-bold": "hsl(var(--foreground))",
						"--tw-prose-counters": "hsl(var(--foreground) / 0.7)",
						"--tw-prose-bullets": "hsl(var(--foreground) / 0.6)",
						"--tw-prose-hr": "hsl(var(--foreground) / 0.3)",
						"--tw-prose-quotes": "hsl(var(--foreground) / 0.9)",
						"--tw-prose-quote-borders":
							"hsl(var(--foreground) / 0.3)",
						"--tw-prose-captions": "hsl(var(--foreground) / 0.7)",
						"--tw-prose-code": "hsl(var(--foreground))",
						"--tw-prose-pre-code": "hsl(var(--foreground))",
						"--tw-prose-pre-bg": "hsl(var(--background))",
						"--tw-prose-th-borders": "hsl(var(--foreground) / 0.3)",
						"--tw-prose-td-borders": "hsl(var(--foreground) / 0.2)",
					},
				},
			}),
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				paper: {
					DEFAULT: "hsl(var(--paper))",
					foreground: "hsl(var(--paper-foreground))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},

		fontSize: {
			xxs: "0.625rem",
			xs: "0.75rem",
			sm: "0.875rem",
			base: "1rem",
			lg: "1.125rem",
			xl: "1.25rem",
			"2xl": "1.5rem",
			"3xl": "1.875rem",
			"4xl": "2.25rem",
			"5xl": "3rem",
			"6xl": "4rem",
			"7xl": "5rem",
			"8xl": "6rem",
			"9xl": "8rem",
		},
	},
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/typography"),
	],
} satisfies Config;

export default config;
