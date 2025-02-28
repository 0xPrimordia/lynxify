import { HederaAgentKit } from 'hedera-agent-kit';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        // Initialize HederaAgentKit
        const kit = new HederaAgentKit(
            process.env.HEDERA_ACCOUNT_ID!,
            process.env.HEDERA_PRIVATE_KEY!,
            'testnet'
        );

        console.log('Creating LYNX Analysis Topic...');
        
        // Create topic with memo for easy identification
        const result = await kit.createTopic(
            "LYNX Index Token Minting Analysis", 
            true // Enable message submission by anyone
        );

        console.log('Topic created successfully!');
        console.log('Topic ID:', result.topicId);
        console.log('\nAdd this Topic ID to your .env.local file as ANALYSIS_TOPIC_ID');

    } catch (error) {
        console.error('Failed to create topic:', error);
        process.exit(1);
    }
}

main(); 