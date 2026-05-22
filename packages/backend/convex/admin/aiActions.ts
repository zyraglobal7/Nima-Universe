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
    .describe('The primary category. IMPORTANT: Use "swimwear" for ANY bathing suit, bikini, or swim trunks, even if it is a set of items. Use "outfit" for non-swimwear sets (e.g., suit, tracksuit).'),
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
    _ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{
    success: boolean;
    data?: ProductDetails;
    error?: string;
  }> => {
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

// Zod schema for bulk enrichment (no name or suggestedPriceRange — user controls those)
const bulkEnrichSchema = z.object({
  brand: z.string().optional().describe('Brand name if visible or recognizable'),
  description: z
    .string()
    .describe('A detailed, engaging product description for an e-commerce listing (2-3 sentences)'),
  category: z
    .enum(['top', 'bottom', 'dress', 'outfit', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry', 'swimwear'])
    .describe('The primary category. IMPORTANT: Use "swimwear" for ANY bathing suit, bikini, or swim trunks, even if it is a set of items. Use "outfit" for non-swimwear sets.'),
  subcategory: z.string().optional().describe('More specific category (e.g., "t-shirt", "jeans", "sneakers")'),
  suggestedGender: z.enum(['male', 'female', 'unisex']).describe('The target gender for this item'),
  colors: z.array(z.string()).describe('List of colors visible in the item'),
  tags: z.array(z.string()).describe('Style tags for the item (e.g., ["casual", "summer", "streetwear"])'),
  material: z.string().optional().describe('Likely material of the item if identifiable'),
  occasion: z.array(z.string()).optional().describe('Suitable occasions (e.g., ["casual", "work"])'),
  season: z.array(z.string()).optional().describe('Suitable seasons (e.g., ["summer", "all_season"])'),
});

type BulkEnrichData = z.infer<typeof bulkEnrichSchema>;

/**
 * Enrich a product image with AI-generated metadata for bulk upload.
 * Does NOT infer name or price — those are user-controlled in bulk mode.
 */
export const bulkEnrichItem = action({
  args: {
    imageUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    data: v.optional(
      v.object({
        brand: v.optional(v.string()),
        description: v.string(),
        category: v.union(
          v.literal('top'), v.literal('bottom'), v.literal('dress'), v.literal('outfit'),
          v.literal('outerwear'), v.literal('shoes'), v.literal('accessory'), v.literal('bag'),
          v.literal('jewelry'), v.literal('swimwear')
        ),
        subcategory: v.optional(v.string()),
        suggestedGender: v.union(v.literal('male'), v.literal('female'), v.literal('unisex')),
        colors: v.array(v.string()),
        tags: v.array(v.string()),
        material: v.optional(v.string()),
        occasion: v.optional(v.array(v.string())),
        season: v.optional(v.array(v.string())),
      })
    ),
    error: v.optional(v.string()),
  }),
  handler: async (
    _ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{ success: boolean; data?: BulkEnrichData; error?: string }> => {
    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: bulkEnrichSchema,
        schemaName: 'BulkEnrichData',
        schemaDescription: 'Fashion product metadata extracted from an image (no name or price)',
        messages: [
          {
            role: 'system',
            content: `You are a fashion expert and product cataloging specialist.
Analyze the provided image of a fashion item and extract metadata.
Do NOT infer or suggest a product name or price — the seller will provide those.
Be specific about colors, materials, and style characteristics.
Generate an engaging, professional product description suitable for an e-commerce platform.
If you cannot determine certain details with confidence, omit them rather than guessing.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this fashion item image and provide product metadata for our catalog.' },
              { type: 'image', image: args.imageUrl },
            ],
          },
        ],
        temperature: 0.3,
      });
      return { success: true, data: result.object };
    } catch (error) {
      console.error('Bulk enrich error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enrich item',
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
    _ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{
    success: boolean;
    storageId?: Id<'_storage'>;
    url?: string;
    error?: string;
  }> => {
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
      const storageId = await _ctx.storage.store(imageBlob);
      const url = await _ctx.storage.getUrl(storageId);

      return { success: true, storageId, url: url ?? undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate ghost mannequin',
      };
    }
  },
});

const inspirationDetailsSchema = z.object({
  title: z.string().describe('A short, evocative style title (3-6 words, e.g. "Floral wrap midi dress")'),
  description: z
    .string()
    .describe('A 1-2 sentence description of this style suitable for a tailor portfolio'),
  tags: z
    .array(z.string())
    .describe('4-8 lowercase style tags (e.g. ["floral", "midi", "feminine", "summer"])'),
});

export const generateInspirationDetails = action({
  args: { imageUrl: v.string() },
  returns: v.object({
    success: v.boolean(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  }),
  handler: async (
    _ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{ success: boolean; title?: string; description?: string; tags?: string[]; error?: string }> => {
    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: inspirationDetailsSchema,
        schemaName: 'InspirationDetails',
        schemaDescription: 'Style details extracted from a fashion inspiration image',
        messages: [
          {
            role: 'system',
            content: `You are a Nairobi-based fashion stylist. Analyze this inspiration image and extract style details tailored to the East African fashion market. Use descriptive, evocative language.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this style inspiration image and return the title, description, and tags.' },
              { type: 'image', image: args.imageUrl },
            ],
          },
        ],
        temperature: 0.4,
      });
      return { success: true, ...result.object };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'AI analysis failed' };
    }
  },
});

const fabricDetailsSchema = z.object({
  fabricType: z
    .enum(['ankara', 'kitenge', 'cotton', 'linen', 'denim', 'silk', 'lace', 'other'])
    .describe('The fabric type'),
  pattern: z
    .enum(['solid', 'floral', 'geometric', 'tribal', 'stripes', 'checks', 'abstract'])
    .describe('The primary pattern'),
  primaryColor: z
    .string()
    .describe('The dominant color as a hex code (e.g. "#4A90E2")'),
  description: z
    .string()
    .optional()
    .describe('A 1-sentence description of this fabric'),
});

export const analyzeFabricImage = action({
  args: { imageUrl: v.string() },
  returns: v.object({
    success: v.boolean(),
    fabricType: v.optional(v.string()),
    pattern: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    description: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    _ctx: ActionCtx,
    args: { imageUrl: string }
  ): Promise<{ success: boolean; fabricType?: string; pattern?: string; primaryColor?: string; description?: string; error?: string }> => {
    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: fabricDetailsSchema,
        schemaName: 'FabricDetails',
        schemaDescription: 'Fabric details extracted from a photo',
        messages: [
          {
            role: 'system',
            content: `You are a fabric specialist. Analyze this fabric photo and extract its type, pattern, and dominant color. Focus on East African fabrics like ankara, kitenge, etc.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What type of fabric is this? Return the fabric type, pattern, and primary color as a hex code.' },
              { type: 'image', image: args.imageUrl },
            ],
          },
        ],
        temperature: 0.2,
      });
      return { success: true, ...result.object };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'AI analysis failed' };
    }
  },
});

