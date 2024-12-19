import { Alert, Button } from "@nextui-org/react";
import Link from "next/link";

export default function TestnetAlert() {
    if (process.env.NEXT_PUBLIC_HEDERA_NETWORK !== 'testnet') {
        return null;
    }

    return (
        <div className="w-full flex justify-center px-4 mb-6">
            <Alert 
                className="max-w-[800px] [&>svg]:!text-[#0159E0] border-[#0159E0]"
                variant="bordered"
                endContent={
                    <Button 
                        as={Link}
                        href="/testnet-instructions"
                        className="ml-4 mt-1 border-[#0159E0] text-[#0159E0] font-bold"
                        variant="bordered"
                        size="sm"
                    >
                        TESTNET INSTRUCTIONS
                    </Button>
                }
            >
                You are currently on Testnet. This is a testing environment and not suitable for real transactions.
            </Alert>
        </div>
    );
} 