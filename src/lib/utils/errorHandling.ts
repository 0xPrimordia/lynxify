export interface ApiError {
    error: string;
    retryAfter?: number;
}

export async function handleApiResponse(response: Response) {
    if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const retryAfter = resetTime ? Math.ceil((parseInt(resetTime) - Date.now()) / 1000) : 60;
        
        throw {
            error: 'Too many attempts. Please try again later.',
            retryAfter
        };
    }

    const data = await response.json();
    
    if (!response.ok) {
        throw {
            error: data.error || 'An error occurred',
            retryAfter: response.headers.get('Retry-After')
        };
    }

    return data;
}

export function formatRetryMessage(retryAfter: number): string {
    if (retryAfter < 60) {
        return `Please try again in ${retryAfter} seconds`;
    } else {
        const minutes = Math.ceil(retryAfter / 60);
        return `Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
} 