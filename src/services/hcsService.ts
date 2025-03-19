// src/services/hcsService.ts
import { Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { HederaAgentKit } from "hedera-agent-kit";

export class HcsGovernanceService {
  private kit: HederaAgentKit;
  private mainGovernanceTopicId: TopicId | null = null;
  
  constructor() {
    this.kit = new HederaAgentKit(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      process.env.OPERATOR_KEY!,
      'testnet'
    );
  }
  
  async getOrCreateMainGovernanceTopic(): Promise<TopicId> {
    if (this.mainGovernanceTopicId) {
      return this.mainGovernanceTopicId;
    }
    
    // Check if we have a stored topic ID
    const storedTopicId = process.env.MAIN_GOVERNANCE_TOPIC_ID;
    if (storedTopicId) {
      this.mainGovernanceTopicId = TopicId.fromString(storedTopicId);
      return this.mainGovernanceTopicId;
    }
    
    // Create a new main governance topic
    const result = await this.kit.createTopic("LYNX DAO Governance", true);
    this.mainGovernanceTopicId = TopicId.fromString(result.topicId);
    
    return this.mainGovernanceTopicId;
  }
  
  async createUserTopic(userId: string, userPublicKey: string): Promise<string> {
    // Create a topic with the user as admin
    const result = await this.kit.createTopic(
      `LYNX DAO User: ${userId}`,
      true
    );
    
    // Record this user topic in the main governance topic
    const mainTopicId = await this.getOrCreateMainGovernanceTopic();
    await this.kit.submitTopicMessage(
      mainTopicId,
      JSON.stringify({
        type: "USER_TOPIC_CREATED",
        userId,
        userTopicId: result.topicId,
        timestamp: new Date().toISOString()
      })
    );
    
    return result.topicId;
  }
  
  async submitUserPreference(
    userTopicId: string,
    userId: string,
    composition: any,
    lynxStake: number
  ): Promise<string> {
    // Submit to user's personal topic
    const userTopicResult = await this.kit.submitTopicMessage(
      TopicId.fromString(userTopicId),
      JSON.stringify({
        type: "USER_PREFERENCE",
        userId,
        composition,
        timestamp: new Date().toISOString()
      })
    );
    
    console.log("User topic result:", userTopicResult);
    
    // Also submit to main governance topic for aggregation
    const mainTopicId = await this.getOrCreateMainGovernanceTopic();
    const mainTopicResult = await this.kit.submitTopicMessage(
      mainTopicId,
      JSON.stringify({
        type: "USER_PREFERENCE_SUBMISSION",
        userId,
        composition,
        userTopicId,
        lynxStake,
        timestamp: new Date().toISOString()
      })
    );
    
    console.log("Main topic result:", mainTopicResult);
    
    // Return a string representation of the transaction
    return JSON.stringify(mainTopicResult);
  }
  
  async getTopicMessages(topicId: string): Promise<any[]> {
    const messages = await this.kit.getTopicMessages(
      TopicId.fromString(topicId),
      'testnet'
    );
    
    return messages.map(msg => {
      try {
        return JSON.parse(msg.message);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }
  
  async calculateConsensus(): Promise<any> {
    const mainTopicId = await this.getOrCreateMainGovernanceTopic();
    const messages = await this.getTopicMessages(mainTopicId.toString());
    
    // Get the latest preference from each user
    const userPreferences: Record<string, any> = {};
    
    messages.forEach(msg => {
      if (msg.type === "USER_PREFERENCE_SUBMISSION") {
        userPreferences[msg.userId] = {
          composition: msg.composition,
          lynxStake: msg.lynxStake,
          timestamp: msg.timestamp
        };
      }
    });
    
    // Calculate weighted consensus
    return this.calculateWeightedConsensus(Object.values(userPreferences));
  }
  
  private calculateWeightedConsensus(preferences: any[]): any {
    if (preferences.length === 0) {
      return null;
    }
    
    // Group by category and token selection, weighted by LYNX stake
    const categoryPreferences: Record<string, Record<string, number>> = {};
    
    // Count preferences for each token in each category
    preferences.forEach(pref => {
      const weight = pref.lynxStake || 1; // Default weight of 1 if no stake
      
      Object.entries(pref.composition.categories).forEach(([category, data]: [string, any]) => {
        if (!categoryPreferences[category]) {
          categoryPreferences[category] = {};
        }
        
        const token = data.selectedToken;
        if (!categoryPreferences[category][token]) {
          categoryPreferences[category][token] = 0;
        }
        
        categoryPreferences[category][token] += weight;
      });
    });
    
    // Find the most popular token for each category
    const consensusComposition: any = {
      categories: {}
    };
    
    Object.entries(categoryPreferences).forEach(([category, tokens]) => {
      let maxVotes = 0;
      let popularToken = '';
      
      Object.entries(tokens).forEach(([token, votes]) => {
        if (votes > maxVotes) {
          maxVotes = votes;
          popularToken = token;
        }
      });
      
      // Get all available tokens for this category from the first preference that has it
      const availableTokens = preferences.find(p => 
        p.composition.categories[category]
      )?.composition.categories[category].tokens || [popularToken];
      
      // Set the most popular token for this category
      consensusComposition.categories[category] = {
        name: category,
        selectedToken: popularToken,
        tokens: availableTokens,
        allocations: { [popularToken]: 100 } // Default to 100% allocation
      };
    });
    
    return consensusComposition;
  }
  
  async submitTopicMessage(topicId: string, message: string): Promise<void> {
    await this.kit.submitTopicMessage(
      TopicId.fromString(topicId),
      message
    );
  }
}

export const hcsGovernanceService = new HcsGovernanceService();