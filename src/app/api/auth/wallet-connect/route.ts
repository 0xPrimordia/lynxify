import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from "jsonwebtoken";
import { User } from "@supabase/supabase-js";

function decodeBase64(base64String: string) {
  return Buffer.from(base64String, 'base64');
}

function parseSignature(buffer: Buffer) {
  let offset = 0;

  // Skip the first two bytes (0x0a and length byte)
  offset += 2;

  // Read the public key
  const publicKeyLength = buffer[offset + 1];
  const publicKeyBytes = buffer.slice(offset + 2, offset + 2 + publicKeyLength);
  offset += 2 + publicKeyLength;

  // Read the signature
  const signatureLength = buffer[offset + 1];
  const signatureBytes = buffer.slice(offset + 2, offset + 2 + signatureLength);

  return { publicKeyBytes, signatureBytes };
}

// Add this helper function at the top of the file
function sanitizeUser(user: any) {
  return {
    id: user.id,
    hedera_account_id: user.hederaAccountId,
    created_at: user.created_at,
    // Add any other fields you need, ensuring they are simple types
  };
}

// Add this function to create a user in Supabase auth
async function createSupabaseUser(supabase: any, accountId: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    user_metadata: { hederaAccountId: accountId }
  });

  if (error) throw error;
  return data.user;
}

async function getOrCreateAuthUser(supabase: any, accountId: string, userId: string) {
  try {
    // Try to get the auth user
    const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
    if (authUser) return authUser;

    // If not found, create a new auth user
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      user_metadata: { hederaAccountId: accountId },
      email: `${accountId}@placeholder.com`,
      email_confirm: true
    });
    if (createError) throw createError;
    return newAuthUser.user;
  } catch (error) {
    console.error('Error in getOrCreateAuthUser:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
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

  const { accountId, signature, message } = await req.json();

  if (!accountId || !signature || !message) {
    return NextResponse.json({ error: 'Account ID, signature, and message are required' }, { status: 400 });
  }

  try {
    console.log('Received data:', { accountId, signature, message });

    // Verify signature (keep existing verification code)
    // ... (signature verification code)

    // Check if the user exists in the Users table
    let { data: user, error } = await supabase
      .from('Users')
      .select('*')
      .eq('hederaAccountId', accountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    let authUser: User;
    if (!user) {
      // User doesn't exist, create a new one in Supabase auth
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        user_metadata: { hederaAccountId: accountId },
        email: `${accountId}@placeholder.com`,
        email_confirm: true
      });
      if (createError) throw createError;
      authUser = newAuthUser.user;

      // Now create the user in the Users table
      const { data: newUser, error: insertError } = await supabase
        .from('Users')
        .insert([{ hederaAccountId: accountId, id: authUser.id }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    } else {
      // User exists, get the auth user
      const { data: existingAuthUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
      if (authError) throw authError;
      authUser = existingAuthUser.user;
    }

    if (!authUser || !authUser.id) {
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

    // Use the custom JWT to sign in the user
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // You might want to generate a separate refresh token
    });

    if (sessionError) throw sessionError;

    // Return the user and session data
    return NextResponse.json({ 
      user: sanitizeUser(user),
      session: {
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
        user: sessionData.user
      }
    });

  } catch (error) {
    console.error('Error in wallet-connect:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
