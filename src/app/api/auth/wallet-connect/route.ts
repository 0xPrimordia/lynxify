import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase';
import crypto from 'crypto';
import { User } from '@/app/types';

/**
 * This implementation uses admin privileges (service role) because:
 * 1. We need to create pre-verified users without email confirmation
 * 2. We're using wallet signatures as the primary authentication method
 * 3. We need immediate access after wallet connection
 * 4. The admin route allows us to create confirmed users instantly
 * 
 * While generally avoiding admin privileges is best practice, for Web3 wallet-based 
 * authentication this approach is justified as the wallet signature serves as the 
 * authentication mechanism.
 */


function createPasswordHash(signature: any): string {
  const signatureStr = typeof signature === 'string' ? signature : JSON.stringify(signature);
  return crypto.createHash('sha256').update(signatureStr).digest('hex').slice(0, 72);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, signature, message } = body;
    
    console.log('Received wallet connect request:', { accountId, signature, message });
    const serviceClient = createServiceRoleClient();

    const email = `${accountId.replace(/\./g, '-')}@hedera.example.com`;
    
    // Try to sign in first
    console.log('Attempting initial sign in for:', email);
    const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
      email,
      password: createPasswordHash(signature)
    });

    // If sign in succeeds, check/create DB record
    if (!signInError && signInData.session) {
      console.log('Successfully signed in existing user:', signInData.user.id);
      
      // Check if user exists in DB
      console.log('Checking for existing DB record');
      const { data: existingUsers, error: fetchError } = await serviceClient
        .from('Users')
        .select<'*', User>('*')
        .eq('hederaAccountId', accountId);

      if (fetchError) {
        console.error('Error checking for existing user:', fetchError);
        throw new Error('Failed to check for existing user');
      }

      // Create DB record if it doesn't exist
      if (!existingUsers || existingUsers.length === 0) {
        console.log('Creating DB record for existing auth user:', signInData.user.id);
        
        const newUser: User = {
          id: signInData.user.id,
          hederaAccountId: accountId,
          created_at: new Date().toISOString()
        };

        console.log('Attempting to insert user record:', newUser);
        const { error: insertError } = await serviceClient
          .from('Users')
          .upsert(newUser, { 
            onConflict: 'id',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error('DB insert error details:', insertError);
          // Don't throw error here, just log it since user exists
          console.warn('Failed to create/update user record, continuing with session');
        } else {
          console.log('Successfully created/updated DB record');
        }
      }

      // Return session regardless of DB operation result
      return new NextResponse(
        JSON.stringify({ session: signInData.session }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle new user creation
    if (signInError?.message?.includes('Invalid login credentials')) {
      console.log('Creating new user with Hedera ID:', accountId);
      
      const { data: createUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
        email,
        password: createPasswordHash(signature),
        email_confirm: true,
        user_metadata: {
          hederaAccountId: accountId,
          hedera_signature: signature,
          signed_message: message
        }
      });

      if (createUserError) {
        console.error('Auth user creation error:', createUserError);
        throw new Error(`Failed to create auth user: ${createUserError.message}`);
      }

      console.log('Auth user created successfully:', createUserData?.user?.id);

      // Create DB record for new user
      const newUser: User = {
        id: createUserData.user.id,
        hederaAccountId: accountId,
        created_at: new Date().toISOString()
      };

      console.log('Attempting to insert new user record:', newUser);
      const { error: insertError } = await serviceClient
        .from('Users')
        .insert(newUser);

      if (insertError) {
        console.error('DB insert error details:', insertError);
        throw new Error(`Failed to create user record: ${insertError.message}`);
      }

      console.log('Successfully created DB record');

      // Sign in new user
      const { data: newSignInData, error: newSignInError } = await serviceClient.auth.signInWithPassword({
        email,
        password: createPasswordHash(signature)
      });

      if (newSignInError || !newSignInData.session) {
        console.error('Error signing in new user:', newSignInError);
        throw new Error('Failed to sign in new user');
      }

      return new NextResponse(
        JSON.stringify({ session: newSignInData.session }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If we get here, something else went wrong with sign in
    throw new Error(signInError?.message || 'Authentication failed');

  } catch (error: any) {
    console.error('Error in wallet-connect:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || 'No additional details available'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
