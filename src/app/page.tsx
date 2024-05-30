"use client"
import React, { useState, useEffect } from "react";
import LoginButton from './components/LoginButton'
import PortingComponent from "./components/PortingComponent";
import {NextUIProvider} from "@nextui-org/react";
import { HederaProvider } from "./components/HederaProvider";

export default function Home() {

  return (
    <NextUIProvider>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div>
          <HederaProvider>
              <PortingComponent />
          </HederaProvider>
        </div>
      </div>
    </main>
    </NextUIProvider>
  );
}
