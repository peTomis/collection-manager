import { Bricolage_Grotesque, Geist, Geist_Mono, Jost } from "next/font/google";

export const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
// Display face of the Pokémon theme (styles/tailwind.css)
export const jost = Jost({ subsets: ["latin"], variable: "--font-jost" });
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const fontVariables = `${display.variable} ${jost.variable} ${geist.variable} ${geistMono.variable}`;
