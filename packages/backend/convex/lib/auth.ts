import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import type { UserIdentity } from 'convex/server';

/**
 * Shared identity resolution across auth providers.
 *
 * Users can sign in via WorkOS (email/password + hosted), native Sign in with
 * Apple, or native Google. Each provider issues its own JWT with a different
 * `iss`/`sub`, so `ctx.auth.getUserIdentity().subject` is NOT globally unique to
 * a person. The `authIdentities` table maps `(issuer, subject) -> userId`,
 * letting all providers resolve to one canonical Convex user.
 *
 * Use these helpers instead of inlining `by_workos_user_id` lookups.
 */

export type AuthProvider = 'workos' | 'apple' | 'google';

/** Derive the provider name from a JWT issuer string. */
export function providerFromIssuer(issuer: string | undefined): AuthProvider {
  if (!issuer) return 'workos';
  if (issuer.includes('appleid.apple.com')) return 'apple';
  if (issuer.includes('accounts.google.com')) return 'google';
  return 'workos';
}

/**
 * Resolve the authenticated user's canonical Convex record, or `null`.
 * Read-only — safe to call from queries and mutations.
 */
export async function getUserFromIdentity(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // 1. Primary path: the authIdentities mapping.
  const mapping = await ctx.db
    .query('authIdentities')
    .withIndex('by_issuer_subject', (q) =>
      q.eq('issuer', identity.issuer).eq('subject', identity.subject)
    )
    .unique();
  if (mapping) {
    return await ctx.db.get(mapping.userId);
  }

  // 2. Back-compat: pre-migration WorkOS users have no mapping row yet — their
  //    `workosUserId` equals the JWT subject. (New Apple/Google subjects will
  //    not collide with WorkOS ids, so this is safe for all issuers.)
  const legacy = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) =>
      q.eq('workosUserId', identity.subject)
    )
    .unique();
  return legacy ?? null;
}

/** Resolve the authenticated user's record, or throw. */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  const user = await getUserFromIdentity(ctx);
  if (!user) throw new Error('User not found');
  return user;
}

/** Resolve the authenticated user's _id, or throw. */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<'users'>> {
  const user = await requireUser(ctx);
  return user._id;
}

/**
 * Ensure an `authIdentities` row exists for the current identity -> user.
 * Mutation-only (writes). Idempotent. Call after resolving/creating a user in
 * sign-in mutations so future logins hit the fast mapping path.
 */
export async function linkIdentity(
  ctx: MutationCtx,
  identity: UserIdentity,
  userId: Id<'users'>
): Promise<void> {
  const existing = await ctx.db
    .query('authIdentities')
    .withIndex('by_issuer_subject', (q) =>
      q.eq('issuer', identity.issuer).eq('subject', identity.subject)
    )
    .unique();
  if (existing) return;

  await ctx.db.insert('authIdentities', {
    userId,
    issuer: identity.issuer,
    subject: identity.subject,
    provider: providerFromIssuer(identity.issuer),
    email: identity.email,
    createdAt: Date.now(),
  });
}
