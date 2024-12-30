import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';

interface ThresholdStats {
  totalActive: number;
  recentExecutions: number;
  recentFailures: number;
  averageExecutionTime: number | null;
  lastDayVolume: number;
  successRate: number;
}

function calculateAverageExecutionTime(thresholds: any[]): number | null {
  const executedThresholds = thresholds.filter(t => 
    t.status === 'executed' && t.lastExecutedAt && t.lastChecked
  );

  if (executedThresholds.length === 0) return null;

  const totalTime = executedThresholds.reduce((sum, t) => {
    const executionTime = new Date(t.lastExecutedAt).getTime() - new Date(t.lastChecked).getTime();
    return sum + executionTime;
  }, 0);

  return totalTime / executedThresholds.length / 1000; // Convert to seconds
}

function calculateStats(thresholds: any[]): ThresholdStats {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentThresholds = thresholds.filter(t => 
    new Date(t.lastChecked) >= oneDayAgo
  );

  const executedThresholds = recentThresholds.filter(t => t.status === 'executed');
  const failedThresholds = recentThresholds.filter(t => t.status === 'failed');

  const totalVolume = executedThresholds.reduce((sum, t) => 
    sum + (t.condition === 'sell' ? t.stopLossCap : t.buyOrderCap), 0
  );

  return {
    totalActive: thresholds.filter(t => t.isActive).length,
    recentExecutions: executedThresholds.length,
    recentFailures: failedThresholds.length,
    averageExecutionTime: calculateAverageExecutionTime(recentThresholds),
    lastDayVolume: totalVolume,
    successRate: recentThresholds.length > 0 
      ? (executedThresholds.length / recentThresholds.length) * 100 
      : 0
  };
}

export async function GET(req: NextRequest) {
  try {
    // Check for API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true); // Using service role for monitoring
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const timeframe = searchParams.get('timeframe') || '24h';

    // Build query
    let query = supabase
      .from('Thresholds')
      .select('*')
      .order('lastChecked', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    // Apply timeframe filter
    const timeframeMap: { [key: string]: number } = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (timeframeMap[timeframe]) {
      const cutoffTime = new Date(Date.now() - timeframeMap[timeframe]).toISOString();
      query = query.gte('lastChecked', cutoffTime);
    }

    // Execute query with proper error handling
    const { data: thresholds, error } = await query.limit(limit);
    
    if (error) {
      return new NextResponse(
        JSON.stringify({ error: 'Database query failed' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate statistics
    const stats = calculateStats(thresholds || []);

    return new NextResponse(
      JSON.stringify({
        thresholds: thresholds || [],
        stats,
        timeframe,
        limit
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
