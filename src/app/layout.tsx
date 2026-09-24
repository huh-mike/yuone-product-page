import type { Metadata } from "next";
import { Archivo, Nunito_Sans, Raleway } from "next/font/google";
import "./globals.css";

/**
 * Display face for the hero headline / eyebrow / kickers.
 * Variable on both weight (100–900) and width (62–125), so the condensed
 * black of "THAT FITS" and the condensed light of "YOU." come from one file.
 */
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

/** Hairline face for the giant "YU ONE" wordmark: Raleway's 100 weight. */
const raleway = Raleway({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["100"],
  display: "swap",
});

/** UI face — closest widely available match to the yuhome wordmark. */
const nunitoSans = Nunito_Sans({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YU ONE — Build the drying rack that fits you | yuhome",
  description:
    "Start with YU ONE. Add as you grow. A modular automated laundry system that builds around your home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${nunitoSans.variable} ${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
