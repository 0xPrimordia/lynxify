import { AIAnalysisService } from '../src/services/aiAnalysisService';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        // Validate environment variables
        const requiredEnvVars = [
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY',
            'OPENAI_API_KEY',
            'ANALYSIS_TOPIC_ID'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        // Initialize service
        const service = new AIAnalysisService(
            process.env.HEDERA_ACCOUNT_ID!,
            process.env.HEDERA_PRIVATE_KEY!,
            'testnet',
            process.env.ANALYSIS_TOPIC_ID!
        );

        console.log('Starting AI Analysis Service...');
        console.log('Account ID:', process.env.HEDERA_ACCOUNT_ID);
        console.log('Topic ID:', process.env.ANALYSIS_TOPIC_ID);
        console.log('Network: testnet');

        // Start monitoring
        await service.startMonitoring();
    } catch (error) {
        console.error('Failed to start AI Analysis Service:', error);
        process.exit(1);
    }
}

main(); 