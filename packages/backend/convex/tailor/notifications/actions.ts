'use node';

import { internalAction, ActionCtx } from '../../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';

/**
 * Notify the tailor via WhatsApp when a new order is paid.
 * Requires env vars: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Falls back to SMS (Africa's Talking) if WhatsApp fails.
 * If neither is configured, logs the notification intent for manual follow-up.
 */
export const notifyTailorNewOrder = internalAction({
  args: { tailoredOrderId: v.id('tailoredOrders') },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { tailoredOrderId: Id<'tailoredOrders'> }
  ): Promise<null> => {
    const order = await ctx.runQuery(internal.tailor.tailoredOrders.queries.getById, {
      tailoredOrderId: args.tailoredOrderId,
    });
    if (!order) {
      console.error('[TAILOR NOTIFY] Order not found:', args.tailoredOrderId);
      return null;
    }

    // Get tailor's phone number
    const tailor = await ctx.runQuery(internal.tailor.notifications.queries.getSellerPhone, {
      sellerId: order.sellerId,
    });
    if (!tailor?.contactPhone) {
      console.warn('[TAILOR NOTIFY] Tailor has no contactPhone — skipping notification', order.sellerId);
      return null;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.shopnima.ai';
    const orderUrl = `${siteUrl}/seller/tailor/orders/${order._id}`;
    const deadlineStr = new Date(order.deadlineDate).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const message =
      `New Nima Tailored Order!\n` +
      `Order: ${order.orderNumber}\n` +
      `Amount: KES ${order.retailPriceKES.toLocaleString()}\n` +
      `Deadline: ${deadlineStr}\n` +
      `View: ${orderUrl}`;

    // Try WhatsApp first
    const waToken = process.env.WHATSAPP_API_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (waToken && waPhoneId) {
      try {
        const waResponse = await fetch(
          `https://graph.facebook.com/v19.0/${waPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: tailor.contactPhone.replace(/\D/g, ''),
              type: 'text',
              text: { body: message },
            }),
          }
        );

        if (waResponse.ok) {
          console.log('[TAILOR NOTIFY] WhatsApp sent successfully');
          return null;
        }

        const err = await waResponse.json().catch(() => ({}));
        console.warn('[TAILOR NOTIFY] WhatsApp failed, falling back to SMS:', err);
      } catch (e) {
        console.warn('[TAILOR NOTIFY] WhatsApp error, falling back to SMS:', e);
      }
    } else {
      console.warn('[TAILOR NOTIFY] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set — skipping WhatsApp');
    }

    // SMS fallback via Africa's Talking
    const atApiKey = process.env.AFRICASTALKING_API_KEY;
    const atUsername = process.env.AFRICASTALKING_USERNAME;

    if (atApiKey && atUsername) {
      try {
        const smsBody = new URLSearchParams({
          username: atUsername,
          to: tailor.contactPhone,
          message,
          from: 'NimaTailor',
        });

        const smsResponse = await fetch(
          'https://api.africastalking.com/version1/messaging',
          {
            method: 'POST',
            headers: {
              apiKey: atApiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: smsBody.toString(),
          }
        );

        if (smsResponse.ok) {
          console.log('[TAILOR NOTIFY] SMS sent successfully');
        } else {
          const err = await smsResponse.json().catch(() => ({}));
          console.error('[TAILOR NOTIFY] SMS failed:', err);
        }
      } catch (e) {
        console.error('[TAILOR NOTIFY] SMS error:', e);
      }
    } else {
      // Neither channel configured — log for manual follow-up
      console.log(
        '[TAILOR NOTIFY] No notification provider configured. Manual follow-up needed.\n' +
        `Order: ${order.orderNumber}, Tailor phone: ${tailor.contactPhone}\n` +
        `Message: ${message}`
      );
    }

    return null;
  },
});
