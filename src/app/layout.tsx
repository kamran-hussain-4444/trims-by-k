import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Trims by K | Mobile barber, Colchester",
  description: "Skin fades, scissor cuts and beard trims in Colchester and beyond. Book online in under a minute.",
  openGraph: {
    title: "Trims by K | Mobile barber, Colchester",
    description: "Book your next cut in under a minute.",
    images: ["/gallery/cut-1.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${barlow.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
