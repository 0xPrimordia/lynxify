import { Card, CardHeader, CardBody } from '@nextui-org/react';
import { VT323 } from 'next/font/google';
const vt323 = VT323({ weight: "400", subsets: ["latin"] });

export default function DAOInfoPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className={`${vt323.className} text-4xl font-bold mb-6`}>Lynxify DAO Membership</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <h2 className={`${vt323.className} text-2xl font-semibold`}>Requirements for Participation</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Required Assets</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Lynxify Members NFT</li>
              <li>Minimum 100 LXY tokens staked</li>
              <li>HBAR for transaction fees</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">HashiooDAO Form Details</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Valid Hedera account ID</li>
              <li>Discord username</li>
              <li>Proof of NFT ownership</li>
              <li>Intended stake amount</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <h2 className={`${vt323.className} text-2xl font-semibold`}>Governance Structure</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Voting Power</h3>
            <p>1 staked LXY token = 1 vote</p>
            <p className="text-sm text-muted-foreground mt-2">
              Minimum 100 LXY tokens must remain staked to maintain voting rights
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Proposal Timeline</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voting Period: 7 days</li>
              <li>Execution Delay: 48 hours after passing</li>
              <li>Minimum Quorum: 10% of total staked tokens</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className={`${vt323.className} text-2xl font-semibold`}>Rewards & Benefits</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="list-disc pl-6 space-y-2">
            <li>Share of LP swap fees proportional to stake</li>
            <li>Voting rights on index composition</li>
            <li>Access to exclusive DAO events and discussions</li>
            <li>Priority access to new features and products</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Note: All rewards are distributed automatically through smart contracts based on staking participation
          </p>
        </CardBody>
      </Card>
    </div>
  );
} 