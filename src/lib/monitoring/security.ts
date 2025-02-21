import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

interface SecurityEvent {
    type: 'rate_limit' | 'auth_failure' | 'suspicious_pattern';
    userId?: string;
    ip: string;
    timestamp: number;
    details: Record<string, any>;
}

export class SecurityMonitor {
    private redis: Redis;
    private readonly PREFIX = 'security:events:';

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async logEvent(request: NextRequest, event: Omit<SecurityEvent, 'ip' | 'timestamp'>) {
        const securityEvent: SecurityEvent = {
            ...event,
            ip: request.ip || 'unknown',
            timestamp: Date.now(),
        };

        // Store event in Redis with TTL
        await this.redis.setex(
            `${this.PREFIX}${securityEvent.timestamp}`,
            86400, // 24 hours retention
            JSON.stringify(securityEvent)
        );

        // Update pattern detection
        await this.detectSuspiciousPatterns(securityEvent);
    }

    private async detectSuspiciousPatterns(event: SecurityEvent) {
        const window = 3600000; // 1 hour
        const threshold = 10; // Number of events before considered suspicious

        const recentEvents = await this.redis.keys(`${this.PREFIX}*`);
        const count = recentEvents.length;

        if (count >= threshold) {
            // Log suspicious pattern
            await this.redis.setex(
                `security:suspicious:${event.ip}`,
                3600, // 1 hour block
                JSON.stringify({
                    type: 'suspicious_pattern',
                    count,
                    firstEvent: event.timestamp - window,
                    lastEvent: event.timestamp
                })
            );
        }
    }
} 