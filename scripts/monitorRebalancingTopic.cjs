const { Client, TopicMessageQuery } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`);
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenv.config();
}

async function monitorRebalancingTopic() {
  // Check for environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const topicId = process.env.LYNX_REBALANCING_TOPIC_ID;
  
  if (!operatorId || !operatorKey || !topicId) {
    throw new Error("Missing required environment variables");
  }
  
  console.log(`Monitoring topic: ${topicId}`);
  
  // Create Hedera client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  // Subscribe to the topic
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(
      client,
      (message) => {
        const messageContent = Buffer.from(message.contents).toString();
        try {
          const parsedMessage = JSON.parse(messageContent);
          console.log("\n----- New Message -----");
          console.log("Timestamp:", new Date(message.consensusTimestamp.seconds * 1000).toISOString());
          console.log("Sequence:", message.sequenceNumber);
          console.log("Type:", parsedMessage.type);
          console.log("Content:", JSON.stringify(parsedMessage, null, 2));
        } catch (e) {
          console.log("Raw message:", messageContent);
        }
      }
    );
  
  console.log("Monitoring started. Press Ctrl+C to exit.");
}

monitorRebalancingTopic().catch(console.error); 