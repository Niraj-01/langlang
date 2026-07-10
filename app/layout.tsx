import type { Metadata, Viewport } from "next";
import { Archivo_Black, Source_Sans_3, Noto_Sans_JP, Inter } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";
import { SyncBoot } from "@/components/SyncBoot";

const archivo = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo",
});

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
});

// UI font for the Learn (Japanese reference) zone
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "langlang",
  description: "The doomscroll that makes you fluent.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "langlang",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${source.variable} ${notoJp.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="h-full">
        <SwRegister />
        <SyncBoot />
        {children}
      </body>
    </html>
  );
}
