import { NextRequest, NextResponse } from 'next/server';
import { HederaAgentKit } from 'hedera-agent-kit';
import { TopicId } from "@hashgraph/sdk";

export async function GET(request: NextRequest) {
  try {
    // Initialize HederaAgentKit with operator credentials
    const kit = new HederaAgentKit(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      process.env.OPERATOR_KEY!,
      'testnet'
    );
    
    // Get rebalancing topic
    const topicId = process.env.LYNX_REBALANCING_TOPIC_ID;
    
    if (!topicId) {
      return NextResponse.json(
        { error: 'Rebalancing topic ID not configured' },
        { status: 500 }
      );
    }
    
    // Get messages from the topic
    const messages = await kit.getTopicMessages(TopicId.fromString(topicId), 'testnet');
    
    // Parse and filter messages
    const history = messages
      .map(msg => {
        try {
          const parsed = JSON.parse(msg.message);
          return {
            ...parsed,
            consensusTimestamp: msg.consensus_timestamp,
            sequenceNumber: msg.sequence_number
          };
        } catch (e) {
          return null;
        }
      })
      .filter(msg => msg !== null);
    
    // Group messages by request ID
    const requestMap = new Map();
    
    history.forEach(msg => {
      if (msg.requestId) {
        if (!requestMap.has(msg.requestId)) {
          requestMap.set(msg.requestId, {
            requestId: msg.requestId,
            request: null,
            recommendations: [],
            executions: []
          });
        }
        
        const requestData = requestMap.get(msg.requestId);
        
        if (msg.type === 'REBALANCE_REQUEST') {
          requestData.request = msg;
        } else if (msg.type === 'REBALANCE_RECOMMENDATION') {
          requestData.recommendations.push(msg);
        } else if (msg.type === 'REBALANCE_EXECUTION') {
          requestData.executions.push(msg);
        }
      }
    });
    
    // Convert map to array and sort by timestamp (newest first)
    const rebalancingHistory = Array.from(requestMap.values())
      .filter(item => item.request) // Only include complete requests
      .sort((a, b) => {
        const timestampA = new Date(a.request.timestamp).getTime();
        const timestampB = new Date(b.request.timestamp).getTime();
        return timestampB - timestampA;
      });
    
    return NextResponse.json({
      history: rebalancingHistory,
      rawMessages: history,
      topicId
    });
    
  } catch (error: any) {
    console.error('Error retrieving rebalancing history:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 