import { checkTokenAssociation, associateToken } from '../utils/tokens';
import { WHBAR_ID } from '../constants';

export const verifyThresholdTokens = async (
  hederaAccountId: string,
  tokenA: string,
  tokenB: string,
  isHbarInvolved: boolean
): Promise<{ needsAssociation: boolean; token?: string }> => {
  // Skip WHBAR checks since it doesn't need association
  if (isHbarInvolved) {
    // Only check the non-HBAR token
    const tokenToCheck = tokenA === WHBAR_ID ? tokenB : tokenA;
    const isAssociated = await checkTokenAssociation(hederaAccountId, tokenToCheck);
    return {
      needsAssociation: !isAssociated,
      token: !isAssociated ? tokenToCheck : undefined
    };
  }

  // Check both tokens for token-to-token pairs
  const isTokenAAssociated = await checkTokenAssociation(hederaAccountId, tokenA);
  if (!isTokenAAssociated) {
    return { needsAssociation: true, token: tokenA };
  }

  const isTokenBAssociated = await checkTokenAssociation(hederaAccountId, tokenB);
  if (!isTokenBAssociated) {
    return { needsAssociation: true, token: tokenB };
  }

  return { needsAssociation: false };
}; 