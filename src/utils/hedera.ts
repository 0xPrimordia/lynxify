import { PublicKey } from "@hashgraph/sdk";

function decodeBase64(base64String: string) {
  return Buffer.from(base64String, 'base64');
}

function parseSignature(buffer: Buffer) {
  let offset = 0;
  offset += 2;
  const publicKeyLength = buffer[offset + 1];
  const publicKeyBytes = buffer.slice(offset + 2, offset + 2 + publicKeyLength);
  offset += 2 + publicKeyLength;
  const signatureLength = buffer[offset + 1];
  const signatureBytes = buffer.slice(offset + 2, offset + 2 + signatureLength);
  return { publicKeyBytes, signatureBytes };
}

export async function verifyHederaSignature(accountId: string, message: string, signature: string): Promise<boolean> {
  try {
    const decodedSignature = decodeBase64(signature);
    const { publicKeyBytes, signatureBytes } = parseSignature(decodedSignature);
    const publicKey = PublicKey.fromBytes(publicKeyBytes);
    const messageToVerify = Buffer.from(`\x19Hedera Signed Message:\n${message.length}${message}`);
    return publicKey.verify(messageToVerify, signatureBytes);
  } catch (error) {
    console.error('Error verifying Hedera signature:', error);
    return false;
  }
}
