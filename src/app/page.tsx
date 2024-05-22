"use client"
import React, { useState, useEffect } from "react";
import LoginButton from './components/LoginButton'
import PortingComponent from "./components/PortingComponent";
import {NextUIProvider} from "@nextui-org/react";

export default function Home() {

  return (
    <NextUIProvider>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
          <LoginButton />
        </div>
        <div>
        <PortingComponent />
        </div>
      </div>
    </main>
    </NextUIProvider>
  );
}
