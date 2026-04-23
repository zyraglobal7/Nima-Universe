'use node';

import { action, ActionCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { v } from 'convex/values';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Category and gender validators for return type
const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry'),
  v.literal('swimwear')
);

const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

// Zod schema for AI generation
const productDetailsSchema = z.object({
  name: z.string().describe('A concise, appealing product name'),
  brand: z.string().optional().describe('Brand name if visible or recognizable'),
  description: z
    .string()
    .describe('A detailed, engaging product description for an e-commerce listing (2-3 sentences)'),
  category: z
    .enum(['top', 'bottom', 'dress', 'outfit', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry', 'swimwear'])
    .describe('The primary category of the fashion item'),
  subcategory: z
    .string()
    .optional()
    .describe('More specific category (e.g., "t-shirt", "jeans", "sneakers", "blazer")'),
  suggestedGender: z
    .enum(['male', 'female', 'unisex'])
    .describe('The target gender for this item'),
  colors: z
    .array(z.string())
    .describe('List of colors visible in the item (e.g., ["navy blue", "white"])'),
  tags: z
    .array(z.string())
    .describe('Style tags for the item (e.g., ["casual", "summer", "streetwear", "minimalist"])'),
  material: z.string().optional().describe('Likely material of the item if identifiable'),
  occasion: z
    .array(z.string())
    .optional()
    .describe('Suitable occasions (e.g., ["casual", "work", "date_night"])'),
  season: z
    .array(z.string())
    .optional()
    .describe('Suitable seasons (e.g., ["summer", "spring", "all_season"])'),
  suggestedPriceRange: z
    .object({
      min: z.number().describe('Minimum suggested price in KES'),
      max: z.number().describe('Maximum suggested price in KES'),
    })
    .optional()
    .describe('Suggested price range based on apparent quality and style'),
});

type ProductDetails = z.infer<typeof productDetailsSchema>;

// Create OpenAI provider instance
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

/**
 * Generate product details from an image using AI vision
 * Uses GPT-4o vision to analyze the product image and extract details
 */
export const generateProductDetails = action({
  args: {
    imageUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    data: v.optional(
      v.object({
        name: v.string(),
        brand: v.optional(v.string()),
        description: v.string(),
        category: categoryValidator,
        subcategory: v.optional(v.string()),
        suggestedGender: genderValidator,
        colors: v.array(v.string()),
        tags: v.array(v.string()),
        material: v.optional(v.string()),
        occasion: v.optional(v.array(v.string())),
        season: v.optional(v.array(v.string())),
        suggestedPriceRange: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
          })
        ),
      })
    ),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{
    success: boolean;
    data?: ProductDetails;
    error?: string;
  }> => {
    // Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: productDetailsSchema,
        schemaName: 'ProductDetails',
        schemaDescription: 'Details about a fashion product extracted from an image',
        messages: [
          {
            role: 'system',
            content: `You are a fashion expert and product cataloging specialist. 
Analyze the provided image of a fashion item and extract detailed product information.
Be specific about colors, materials, and style characteristics.
Generate engaging, professional product descriptions suitable for an e-commerce platform.
If you cannot determine certain details with confidence, omit them rather than guessing.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this fashion item image and provide detailed product information for our catalog.',
              },
              {
                type: 'image',
                image: args.imageUrl,
              },
            ],
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      return {
        success: true,
        data: result.object,
      };
    } catch (error) {
      console.error('AI product generation error:', error);
      
      // Handle the case where AI returns malformed JSON schema format
      // The error object contains a 'text' property with the raw response
      if (error && typeof error === 'object' && 'text' in error) {
        try {
          const errorText = (error as { text?: string }).text;
          if (typeof errorText === 'string') {
            const parsed = JSON.parse(errorText);
            
            // If it's wrapped in a schema format, extract from properties
            if (parsed.type === 'object' && parsed.properties) {
              const productData = parsed.properties;
              
              // Validate the extracted data
              const validated = productDetailsSchema.safeParse(productData);
              if (validated.success) {
                return {
                  success: true,
                  data: validated.data,
                };
              } else {
                console.error('Schema validation failed after extraction:', validated.error);
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate product details',
      };
    }
  },
});

/**
 * Apply ghost mannequin effect to a product image using Gemini image generation.
 * Removes the model/mannequin and returns a new image of the garment appearing
 * to be worn by an invisible body.
 */
export const generateGhostMannequin = action({
  args: {
    imageUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    storageId: v.optional(v.id('_storage')),
    url: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{
    success: boolean;
    storageId?: Id<'_storage'>;
    url?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(args.imageUrl);
      const buffer = await response.arrayBuffer();
      const imageBase64 = Buffer.from(buffer).toString('base64');

      const result = await genAI.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [
          {
            text: `Ghost mannequin effect: Transform this clothing item photo so the garment appears to be worn by an invisible ghost mannequin. Remove any visible person, model, or physical mannequin entirely. The clothing should appear naturally filled out and structured in 3D space with proper volume, shape, and drape as if worn by an invisible body. Preserve all garment details, colors, patterns, and textures exactly. Use a clean white or neutral background. The result should look like a professional e-commerce product photo where the clothing is worn by an unseen body.`,
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });

      const parts = result.candidates?.[0]?.content?.parts;
      let generatedImageBase64: string | null = null;

      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            generatedImageBase64 = part.inlineData.data;
            break;
          }
        }
      }

      if (!generatedImageBase64) {
        throw new Error('Ghost mannequin generation returned no image');
      }

      const imageBytes = Buffer.from(generatedImageBase64, 'base64');
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const storageId = await ctx.storage.store(imageBlob);
      const url = await ctx.storage.getUrl(storageId);

      return { success: true, storageId, url: url ?? undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate ghost mannequin',
      };
    }
  },
});
