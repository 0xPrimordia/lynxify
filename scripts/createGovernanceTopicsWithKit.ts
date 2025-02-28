const { HederaAgentKit } = require('hedera-agent-kit');
const dotenvKit = require('dotenv');
const pathKit = require('path');
const fsKit = require('fs');

// Load environment variables from .env.local
const envLocalPath = pathKit.resolve(process.cwd(), '.env.local');
if (fsKit.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`);
  const envConfig = dotenvKit.parse(fsKit.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvKit.config();
}

async function main() {
  try {
    // Check for environment variables
    const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
    const operatorKey = process.env.OPERATOR_KEY;
    
    console.log("Environment variables:");
    console.log(`NEXT_PUBLIC_OPERATOR_ID: ${operatorId || 'not set'}`);
    console.log(`OPERATOR_KEY: ${operatorKey ? '****' : 'not set'}`);
    
    if (!operatorId || !operatorKey) {
      throw new Error("Environment variables NEXT_PUBLIC_OPERATOR_ID and OPERATOR_KEY must be set");
    }
    
    // Initialize HederaAgentKit
    const kit = new HederaAgentKit(
      operatorId,
      operatorKey,
      'testnet'
    );
    
    // Create governance topics
    const topics = [
      { name: "LYNX-Governance", memo: "Main governance topic for LYNX protocol" },
      { name: "LYNX-Rebalancing", memo: "Rebalancing analysis and execution for LYNX token" },
      { name: "LYNX-Proposals", memo: "User proposals and voting for LYNX governance" },
      { name: "LYNX-Market-Analysis", memo: "Market condition analysis for LYNX token" }
    ];
    
    // Create each topic
    for (const topic of topics) {
      console.log(`Creating ${topic.name} topic...`);
      
      // Create topic with memo for easy identification
      const result = await kit.createTopic(
        topic.memo,
        true // Enable message submission by anyone
      );
      
      console.log(`Created ${topic.name} topic with ID: ${result.topicId}`);
      
      if (topic.name === "LYNX-Rebalancing") {
        console.log(`\nAdd this to your .env.local file as LYNX_REBALANCING_TOPIC_ID=${result.topicId}`);
      }
    }
    
  } catch (error) {
    console.error('Failed to create topics:', error);
    process.exit(1);
  }
}

main(); 