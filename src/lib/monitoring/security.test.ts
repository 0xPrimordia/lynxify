import { SecurityMonitor } from './security';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

describe('SecurityMonitor', () => {
    let monitor: SecurityMonitor;
    let mockRedis: jest.Mocked<Redis>;
    let mockRequest: Partial<NextRequest>;

    beforeEach(() => {
        mockRedis = {
            setex: jest.fn().mockResolvedValue(true),
            keys: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<Redis>;

        monitor = new SecurityMonitor(mockRedis);

        mockRequest = {
            ip: '127.0.0.1',
            headers: new Headers()
        };
    });

    it('should log security events', async () => {
        await monitor.logEvent(mockRequest as NextRequest, {
            type: 'rate_limit',
            details: { test: 'data' }
        });

        expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should detect suspicious patterns', async () => {
        mockRedis.keys.mockResolvedValue(Array(11).fill('event'));

        await monitor.logEvent(mockRequest as NextRequest, {
            type: 'rate_limit',
            details: { test: 'data' }
        });

        expect(mockRedis.setex).toHaveBeenCalledWith(
            expect.stringContaining('security:suspicious:'),
            expect.any(Number),
            expect.any(String)
        );
    });
}); 