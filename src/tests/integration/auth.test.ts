import { createClient } from '@supabase/supabase-js';
import { validateTestEnvironment } from './helpers/setup';

jest.setTimeout(5000); // Increase timeout to 60 seconds

describe.skip('Auth Flow', () => {
    let supabase: any;

    beforeAll(() => {
        console.log('Test setup - validating environment');
        validateTestEnvironment();
        
        console.log('Creating Supabase client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    });

    it('should create user and DB record', async () => {
        try {
            console.log('Starting test');
            const testEmail = `test-${Date.now()}@example.com`;
            const testPassword = 'testPassword123';
            const testAccountId = `0.0.${Date.now()}`;

            // First try signing in (should fail and trigger creation)
            console.log('Attempting initial sign in');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword
            });

            console.log('Initial sign-in result:', { signInData, error: signInError?.message });
            expect(signInError?.message).toContain('Invalid login credentials');

            // Then proceed with creation
            console.log('Creating user:', { testEmail, testAccountId });
            const response = await fetch('http://localhost:3000/api/auth/in-app-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword,
                    accountId: testAccountId
                })
            });

            const responseText = await response.text();
            console.log('API Response:', responseText);
            
            if (!response.ok) {
                console.error('API Error:', responseText);
                throw new Error(`API request failed: ${responseText}`);
            }

            // Add delay before checking auth user
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check auth user
            const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
            const authUser = users.find((user: any) => user.email === testEmail);
            
            if (authError) {
                console.error('Auth user check failed:', authError);
                throw authError;
            }
            console.log('Auth user created:', authUser);

            // Check DB record
            const { data: dbUser, error: dbError } = await supabase
                .from('Users')
                .select('*')
                .eq('hederaAccountId', testAccountId)
                .single();
            
            if (dbError) {
                console.error('DB user check failed:', dbError);
                throw dbError;
            }
            console.log('DB user created:', dbUser);

            expect(authUser).toBeTruthy();
            expect(dbUser).toBeTruthy();
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    }, 60000); // Individual test timeout
}); 