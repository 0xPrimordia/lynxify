const dotenvHCS = require('dotenv');
const pathHCS = require('path');
const fsHCS = require('fs');
const { HCSService } = require('../src/services/hcsService');

// Load environment variables from .env.local
const envLocalPathHCS = pathHCS.resolve(process.cwd(), '.env.local');
if (fsHCS.existsSync(envLocalPathHCS)) {
  console.log(`Loading environment from ${envLocalPathHCS}`);
  const envConfig = dotenvHCS.parse(fsHCS.readFileSync(envLocalPathHCS));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvHCS.config();
}

async function testHCSService() {
  try {
    // Check for environment variables
    const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
    const operatorKey = process.env.OPERATOR_KEY;
    const topicId = process.env.LYNX_GOVERNANCE_TOPIC_ID;
    
    if (!operatorId || !operatorKey || !topicId) {
      throw new Error("Missing required environment variables");
    }
    
    console.log('Testing HCS Service...');
    console.log(`Using topic: ${topicId}`);
    
    // Initialize service
    const hcsService = new HCSService({
      operatorId,
      operatorKey,
      network: 'testnet'
    });
    
    // Test message submission
    const testMessage = {
      type: 'TEST_MESSAGE',
      timestamp: new Date().toISOString(),
      content: 'This is a test message from the HCS Service test script',
      metadata: {
        scriptName: 'testHCSService.ts',
        environment: 'test'
      }
    };
    
    console.log('Submitting test message...');
    const txId = await hcsService.submitMessage(topicId, testMessage);
    
    console.log('Message submitted successfully!');
    console.log('Transaction ID:', txId);
    
    // Test message retrieval
    console.log('Retrieving messages...');
    const messages = await hcsService.getTopicMessages(topicId);
    
    console.log(`Retrieved ${messages.length} messages`);
    if (messages.length > 0) {
      console.log('Latest message:');
      console.log(JSON.stringify(messages[messages.length - 1], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing HCS Service:', error);
  }
}

testHCSService(); 