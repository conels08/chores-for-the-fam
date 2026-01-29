import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const hashInviteToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const tokenHash = hashInviteToken(token);

  const { data, error } = await supabase.rpc('validate_invite', {
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.json({ error: 'Invite invalid or expired.' }, { status: 400 });
  }

  const invite = Array.isArray(data) ? data[0] : data;

  if (!invite) {
    return NextResponse.json({ error: 'Invite invalid or expired.' }, { status: 400 });
  }

  return NextResponse.json({ invite });
}
