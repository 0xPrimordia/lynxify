import { FunctionComponent } from "react";
import { useHederaClient } from "./HederaProvider";
import StakeTokens from "./StakeTokens";

interface StakingComponentProps {
    
}
 
const StakingComponent: FunctionComponent<StakingComponentProps> = () => {
    const { client } = useHederaClient();

    const stakeTokens = () => {
        // hedera contract for staking

    }

    return ( 
        <>
            <StakeTokens stakeTokens={stakeTokens} />
        </>  
    );
}
 
export default StakingComponent;