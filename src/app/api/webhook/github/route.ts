import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

async function verifyGithubSignature(
  secret: string,
  body: string,
  signatureHeader: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const bodyData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expected = `sha256=${hex}`;

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    const event = request.headers.get('x-github-event') || 'unknown';
    const body = await request.text();

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const valid = await verifyGithubSignature(secret, body, signature);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    if (event === 'ping') {
      return NextResponse.json({
        received: true,
        event: 'ping',
        message: 'GitHub webhook ping successful',
        timestamp: new Date().toISOString(),
      });
    }

    let repoName: string | null = null;
    try {
      if (body) {
        const payload = JSON.parse(body);
        if (payload?.repository?.name) {
          repoName = payload.repository.name;
        }
      }
    } catch {
      // Body may not be JSON; continue with general revalidation
    }

    // Revalidate cached GitHub repos and homepage
    revalidateTag('github-repos', { expire: 0 });
    revalidatePath('/', 'layout');
    revalidatePath('/feed.xml');
    revalidatePath('/sitemap.xml');

    if (repoName) {
      revalidateTag(`github-readme-${repoName}`, { expire: 0 });
      revalidateTag(`github-tool-${repoName}`, { expire: 0 });
      revalidatePath(`/tools/${repoName}`, 'page');
    }

    return NextResponse.json({
      received: true,
      event,
      repository: repoName,
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhook/github',
    description: 'GitHub Organization Webhook Receiver for Daedalabs',
  });
}
