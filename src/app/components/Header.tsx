"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";

const vt323 = VT323({ weight: "400", subsets: ["latin"] })
 
const Header = () => {
    const { handleConnect, handleDisconnectSessions, account } = useWalletContext();

    return ( 
        <Navbar maxWidth="full">
          <NavbarBrand>
            <span className="box"><h1 style={{fontSize: "2.5rem", color: "#4E94FE"}} className={vt323.className+" font-bold"}>Lynxify</h1></span>
          </NavbarBrand>
          <NavbarContent className="hidden sm:flex gap-4 pt-3" justify="center">
            <NavbarItem>
              <Link color="foreground" href="/">
                Stake
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link color="foreground" href="/dex">
                Swap
              </Link>
            </NavbarItem>
          </NavbarContent>
          <NavbarContent justify="end">
            <NavbarItem className="hidden lg:flex">
              {account === "" ? (
                  <p><Button className="mt-4" onClick={() => handleConnect()}>Connect Wallet</Button></p>
                ):(
                  <>
                  <p className="text-sm mt-4"><span onClick={() => handleDisconnectSessions()}>Sign Out {account}</span> <img style={{width:"30px", display:"inline-block", marginTop: "-3px"}} src="/images/hedera-hbar-logo.png" /></p>
                </>
                )}
            </NavbarItem>
          </NavbarContent>
        </Navbar>
    );
}
 
export default Header;