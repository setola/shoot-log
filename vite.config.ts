import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const developmentHosts = ["pi-workstation.villa.emanueletessore.com"];

export default defineConfig({
	server: {
		allowedHosts: developmentHosts,
	},
	preview: {
		allowedHosts: developmentHosts,
	},
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg"],
			manifest: {
				name: "Shooting Logbook",
				short_name: "Logbook",
				description: "A privacy-first sport shooting logbook.",
				theme_color: "#111827",
				background_color: "#ffffff",
				display: "standalone",
				icons: [
					{
						src: "favicon.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any maskable",
					},
				],
			},
		}),
	],
	base: "./",
});
