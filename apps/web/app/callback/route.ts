import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
  onError: async ({ error, request }) => {
    console.error('[callback] auth error:', error);
    if (error && typeof error === 'object' && 'cause' in error) {
      console.error('[callback] cause:', (error as any).cause);
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error && error.cause ? String((error as any).cause) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  },
});
