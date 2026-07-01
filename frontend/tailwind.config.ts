import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			ink: 'var(--atlas-ink)',
  			'ink-soft': 'var(--atlas-ink-soft)',
  			muted: {
  				DEFAULT: 'var(--atlas-muted)',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			line: 'var(--atlas-line)',
  			'line-strong': 'var(--atlas-line-strong)',
  			blue: 'var(--atlas-blue)',
  			'blue-dark': 'var(--atlas-blue-dark)',
  			sky: 'var(--atlas-sky)',
  			green: 'var(--atlas-green)',
  			'green-dark': 'var(--atlas-green-dark)',
  			'green-soft': 'var(--atlas-green-soft)',
  			orange: 'var(--atlas-orange)',
  			'orange-soft': 'var(--atlas-orange-soft)',
  			red: 'var(--atlas-red)',
  			'red-soft': 'var(--atlas-red-soft)',
  			surface: 'var(--atlas-surface)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			atlas: 'var(--atlas-shadow)',
  			'atlas-soft': 'var(--atlas-shadow-soft)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
