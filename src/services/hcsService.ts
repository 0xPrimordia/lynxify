import { 
  Client, 
  PrivateKey, 
  TopicCreateTransaction, 
  TopicMessageSubmitTransaction,
  TopicInfoQuery,
  TopicId
} from "@hashgraph/sdk";

export interface HCSConfig {
  operatorId: string;
  operatorKey: string;
  network: 'testnet' | 'mainnet';
}

export class HCSService {
  private client: Client;
  
  constructor(config: HCSConfig) {
    // Initialize Hedera client
    this.client = config.network === 'testnet' 
      ? Client.forTestnet() 
      : Client.forMainnet();
    
    // Set operator account
    this.client.setOperator(config.operatorId, config.operatorKey);
  }
  
  /**
   * Create a new HCS topic for governance functions
   * @param adminKey Optional private key for topic administration
   * @param submitKey Optional private key for message submission
   * @returns The newly created topic ID
   */
  async createTopic(
    adminKey?: PrivateKey, 
    submitKey?: PrivateKey
  ): Promise<string> {
    try {
      // Create a new topic
      let transaction = new TopicCreateTransaction();
      
      // Set admin key if provided
      if (adminKey) {
        transaction.setAdminKey(adminKey);
      }
      
      // Set submit key if provided
      if (submitKey) {
        transaction.setSubmitKey(submitKey);
      }
      
      // Set memo for the topic
      transaction.setTopicMemo("LYNX Governance Topic");
      
      // Submit the transaction
      const txResponse = await transaction.execute(this.client);
      
      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      // Get the topic ID
      const topicId = receipt.topicId!.toString();
      
      console.log(`Created topic with ID: ${topicId}`);
      
      return topicId;
    } catch (error) {
      console.error("Error creating HCS topic:", error);
      throw error;
    }
  }
  
  /**
   * Submit a message to an HCS topic
   * @param topicId The topic ID to submit the message to
   * @param message The message to submit (will be JSON stringified)
   * @param submitKey Optional private key for message submission
   * @returns The transaction ID
   */
  async submitMessage(
    topicId: string, 
    message: any, 
    submitKey?: PrivateKey
  ): Promise<string> {
    try {
      // Convert message to string if it's an object
      const messageString = typeof message === 'object' 
        ? JSON.stringify(message) 
        : message;
      
      // Create the transaction
      let transaction = new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(messageString);
      
      // Sign with submit key if provided
      if (submitKey) {
        transaction = transaction.freezeWith(this.client);
        transaction = await transaction.sign(submitKey);
      }
      
      // Submit the transaction
      const txResponse = await transaction.execute(this.client);
      
      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      console.log(`Submitted message to topic: ${topicId}`);
      
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Error submitting message to HCS topic:", error);
      throw error;
    }
  }
  
  /**
   * Get information about an HCS topic
   * @param topicId The topic ID to get information about
   * @returns The topic information
   */
  async getTopicInfo(topicId: string): Promise<any> {
    try {
      // Create the query
      const query = new TopicInfoQuery()
        .setTopicId(TopicId.fromString(topicId));
      
      // Submit the query
      const info = await query.execute(this.client);
      
      return info;
    } catch (error) {
      console.error("Error getting topic info:", error);
      throw error;
    }
  }

  /**
   * Retrieve messages from an HCS topic
   * @param topicId The topic ID to retrieve messages from
   * @param limit Maximum number of messages to retrieve
   * @returns Array of parsed messages
   */
  async retrieveMessages(topicId: string, limit: number = 100): Promise<any[]> {
    try {
      // In a production environment, you would use a mirror node to retrieve messages
      // For this prototype, we'll simulate message retrieval with a mock implementation
      
      // This would be replaced with actual mirror node API calls
      const mockMessages = [
        {
          consensusTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          message: JSON.stringify({
            type: 'REBALANCE_RECOMMENDATION',
            requestId: 'req-1234567890',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            recommendation: {
              ratios: { hbar: 0.4, sauce: 0.35, clxy: 0.25 },
              confidence: 0.85,
              reasoning: [
                "HBAR has shown lower volatility in recent market conditions",
                "Increased HBAR allocation would reduce overall index volatility",
                "Current market trends favor HBAR price appreciation"
              ],
              volatilityTrend: "decreasing",
              liquidityTrend: "improving",
              dataPoints: 120
            }
          })
        },
        {
          consensusTimestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          message: JSON.stringify({
            type: 'REBALANCE_RECOMMENDATION',
            requestId: 'req-0987654321',
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            recommendation: {
              ratios: { hbar: 0.35, sauce: 0.4, clxy: 0.25 },
              confidence: 0.78,
              reasoning: [
                "SAUCE has shown strong growth potential in the past week",
                "Increased SAUCE allocation would improve overall returns",
                "Market sentiment for SAUCE is positive"
              ],
              volatilityTrend: "stable",
              liquidityTrend: "stable",
              dataPoints: 110
            }
          })
        },
        {
          consensusTimestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          message: JSON.stringify({
            type: 'REBALANCE_RECOMMENDATION',
            requestId: 'req-5678901234',
            timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            recommendation: {
              ratios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
              confidence: 0.72,
              reasoning: [
                "CLXY has shown improved performance metrics",
                "Equal distribution provides balanced exposure",
                "Market conditions suggest minimal adjustments needed"
              ],
              volatilityTrend: "increasing",
              liquidityTrend: "worsening",
              dataPoints: 95
            }
          })
        }
      ];
      
      // Parse messages
      return mockMessages.map(msg => {
        const parsedMessage = JSON.parse(msg.message);
        return {
          consensusTimestamp: msg.consensusTimestamp,
          ...parsedMessage
        };
      });
    } catch (error) {
      console.error("Error retrieving messages from HCS topic:", error);
      throw error;
    }
  }
} 