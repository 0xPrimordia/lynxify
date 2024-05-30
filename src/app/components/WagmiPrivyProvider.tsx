"use client"
import { PrivyProvider } from "@privy-io/react-auth";
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import { http } from 'wagmi';
import {WagmiProvider} from '@privy-io/wagmi';
import { etherlinkTestnet, sepolia } from 'wagmi/chains';
import {createConfig} from '@privy-io/wagmi';

const config = createConfig({
  chains: [etherlinkTestnet],
  transports: {
    [etherlinkTestnet.id]: http('https://node.ghostnet.etherlink.com')
  },
})
  
  export function WagmiPrivyProvider({ children }: any) {
    const queryClient = new QueryClient();

    // todo: what else do we need to do on login?
    const handleLogin = (user: any) => {
      console.log(`User ${user.id} logged in!`);
    };
  
    return (
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_ID as string}
        onSuccess={handleLogin}
        config={{
          //loginMethods: ["sms"],
          appearance: {
            accentColor: '#0159E0',
            logo: '/logo.png',
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider 
            //@ts-ignore doesn't seem to be breaking but should investigate
            config={config}>
            {children}
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }
  