import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./hooks/useWallet";
import { NextUIProvider } from "@nextui-org/react";
import Header from "./components/Header";
import { SaucerSwapProvider } from "./hooks/useTokens";
import { PoolProvider } from "./hooks/usePools";
import FeedbackForm from "./components/FeedbackForm";
import FormspreeProvider from './components/FormspreeProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lynxify | Advanced DEX Trading Platform",
  description: "Access advanced DEX trading features with Lynxify's lifetime membership NFT. Set automated trades, stop losses, and enjoy premium features on the Hedera network.",
  keywords: "Hedera, DEX, Trading, NFT, Cryptocurrency, DeFi, Automated Trading",
  openGraph: {
    title: "Lynxify | Advanced DEX Trading Platform",
    description: "Access advanced DEX trading features with Lynxify's lifetime membership NFT",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/lxy.png", // Make sure this image exists in your public folder
        width: 1200,
        height: 630,
        alt: "Lynxify Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lynxify | Advanced DEX Trading Platform",
    description: "Access advanced DEX trading features with Lynxify's lifetime membership NFT",
    images: ["/images/lxy.png"], // Make sure this image exists in your public folder
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en">
      <body className={inter.className + " dark text-foreground bg-background min-h-screen !bg-black"}>
        <FormspreeProvider>
          <WalletProvider>
            <SaucerSwapProvider>
              <PoolProvider>
                <NextUIProvider>
                  <Header />
                  <main className="flex flex-col items-center p-4">
                    {children}
                  </main>
                  <FeedbackForm />
                </NextUIProvider>
              </PoolProvider>
            </SaucerSwapProvider>
          </WalletProvider>
        </FormspreeProvider>
      </body>
    </html>
  );
}
