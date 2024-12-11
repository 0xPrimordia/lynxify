import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from "jsonwebtoken";
import { User } from "@supabase/supabase-js";

// Add this helper function at the top of the file
function sanitizeUser(user: any) {
  return {
    id: user.id,
    hedera_account_id: user.hederaAccountId,
    created_at: user.created_at,
    // Add any other fields you need, ensuring they are simple types
  };
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, signature, message } = await req.json();

    if (!accountId || !signature || !message) {
      return new NextResponse(
        JSON.stringify({ error: 'Account ID, signature, and message are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let { data: user, error } = await supabase
      .from('Users')
      .select('*')
      .eq('hederaAccountId', accountId)
      .single();

    let authUser: User;
    if (!user) {
      console.log('Creating new user');
      // User doesn't exist, create a new one in Supabase auth
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        user_metadata: { hederaAccountId: accountId },
        email: `${accountId}@placeholder.com`,
        email_confirm: true
      });
      if (createError) {
        console.error('Error creating new auth user:', createError);
        throw createError;
      }
      authUser = newAuthUser.user;
      console.log('New auth user created:', authUser);

      // Now create the user in the Users table
      const { data: newUser, error: insertError } = await supabase
        .from('Users')
        .insert([{ hederaAccountId: accountId, id: authUser.id }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting new user:', insertError);
        throw insertError;
      }
      user = newUser;
      console.log('New user inserted:', user);
    } else {
      console.log('Existing user found, retrieving auth user');
      // User exists, get the auth user
      const { data: existingAuthUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
      if (authError) {
        console.error('Error retrieving existing auth user:', authError);
        throw authError;
      }
      authUser = existingAuthUser.user;
      console.log('Retrieved existing auth user:', authUser);
    }

    if (!authUser || !authUser.id) {
      console.error('Failed to create or retrieve auth user');
      throw new Error('Failed to create or retrieve auth user');
    }

    // Generate a custom JWT token
    const token = jwt.sign(
      {
        sub: authUser.id,
        aud: 'authenticated',
        role: 'authenticated',
        hederaAccountId: accountId
      },
      process.env.SUPABASE_JWT_SECRET!,
      { expiresIn: '1h' }
    );
    console.log('JWT token generated');

    // Use the custom JWT to sign in the user
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    if (sessionError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to set session' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize the response data
    const safeResponse = {
      user: sanitizeUser(user),
      session: {
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
        // Only include necessary user fields
        user: sessionData.user ? {
          id: sessionData.user.id,
          email: sessionData.user.email,
          user_metadata: sessionData.user.user_metadata
        } : null
      }
    };

    return new NextResponse(
      JSON.stringify(safeResponse),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
