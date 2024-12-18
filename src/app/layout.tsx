import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./hooks/useWallet";
import { NextUIProvider } from "@nextui-org/react";
import Header from "./components/Header";
import { SaucerSwapProvider } from "./hooks/useTokens";
import { PoolProvider } from "./hooks/usePools";
import FeedbackForm from "./components/FeedbackForm";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en">
      <body className={inter.className + " dark text-foreground bg-background min-h-screen !bg-black"}>
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
      </body>
    </html>
  );
}
