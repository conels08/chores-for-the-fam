import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const hashInviteToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const type = body?.type;
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const kidName = typeof body?.kidName === 'string' ? body.kidName.trim() : '';

  if (!token) {
    return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });
  }

  if (type !== 'adult' && type !== 'kid') {
    return NextResponse.json({ error: 'Invite type is required.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const tokenHash = hashInviteToken(token);

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (process.env.NODE_ENV === 'development') {
    console.log('accept route user:', user?.id ?? null, userErr?.message ?? null);
  }

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to accept this invite.' }, { status: 401 });
  }

  if (type === 'adult') {
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });
    }

    const { error } = await supabase.rpc('accept_invite_adult', {
      p_token_hash: tokenHash,
      p_display_name: displayName,
    });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('accept_invite_adult RPC failed:', error.code, error.message, error.details);
      }
      return NextResponse.json({ error: 'Invite invalid or expired.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  if (!kidName) {
    return NextResponse.json({ error: 'Kid name is required.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('accept_invite_kid', {
    p_token_hash: tokenHash,
    p_kid_name: kidName,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('accept_invite_kid RPC failed:', error.code, error.message, error.details);
    }
    return NextResponse.json({ error: 'Invite invalid or expired.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
