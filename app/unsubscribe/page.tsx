import { verifyUnsubscribeToken, suppressEmail } from '@/lib/unsubscribe';
import Link from 'next/link';

export default async function UnsubscribePage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const tokenParam = (searchParams?.token || '') as string;
  let status: 'success' | 'invalid' | 'none' = 'none';
  let email: string | null = null;

  if (tokenParam) {
    const verified = verifyUnsubscribeToken(tokenParam);
    if (verified) {
      email = verified;
      await suppressEmail(verified, 'link');
      status = 'success';
    } else {
      status = 'invalid';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-100">
        <h1 className="text-2xl font-semibold mb-2">Unsubscribe</h1>
        {status === 'success' && (
          <div>
            <p className="mb-4">{email ? `We've unsubscribed ${email} from our newsletter.` : `You're unsubscribed.`}</p>
            <p className="text-sm text-neutral-400">You will no longer receive newsletter emails. If this was a mistake, you can resubscribe later from your account settings.</p>
            <div className="mt-6">
              <Link href="/" className="inline-block px-4 py-2 rounded-md bg-yellow-500 text-black">Back to Home</Link>
            </div>
          </div>
        )}
        {status === 'invalid' && (
          <div>
            <p className="mb-4">This unsubscribe link is invalid or has expired.</p>
            <p className="mb-2 text-sm text-neutral-400">You can still unsubscribe by entering your email below:</p>
            <form method="GET" action="/api/unsubscribe" className="space-y-3">
              <input type="email" name="email" required placeholder="your@email.com" className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-100" />
              <button type="submit" className="w-full px-4 py-2 rounded-md bg-yellow-500 text-black">Unsubscribe</button>
            </form>
          </div>
        )}
        {status === 'none' && (
          <div>
            <p className="mb-4">To unsubscribe from our newsletter, please enter your email address below.</p>
            <form method="GET" action="/api/unsubscribe" className="space-y-3">
              <input type="email" name="email" required placeholder="your@email.com" className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-100" />
              <button type="submit" className="w-full px-4 py-2 rounded-md bg-yellow-500 text-black">Unsubscribe</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
