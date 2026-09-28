import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

export const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const fontVariables = `${display.variable} ${geist.variable} ${geistMono.variable}`;
