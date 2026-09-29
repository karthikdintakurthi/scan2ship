import { z } from 'zod';

export const orderIdSchema = z.number().int().positive();

export const searchOrdersInputSchema = z.object({
  query: z.string().trim().max(80).optional(),
  trackingStatus: z.string().trim().max(40).optional(),
  courierService: z.string().trim().max(80).optional(),
  pickupLocation: z.string().trim().max(120).optional(),
  from: z.string().trim().min(1).max(40).optional(),
  to: z.string().trim().min(1).max(40).optional(),
  cursor: z.string().trim().max(512).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const getOrderInputSchema = z.object({
  orderId: orderIdSchema,
});

export const getTrackingStatusInputSchema = z
  .object({
    orderId: orderIdSchema.optional(),
    trackingId: z.string().trim().min(1).max(80).optional(),
  })
  .refine((value) => Boolean(value.orderId || value.trackingId), {
    message: 'Provide orderId or trackingId',
  });

export const quoteShippingInputSchema = z.object({
  weightGrams: z.number().positive().max(50000),
  packageValueInr: z.number().min(0).max(1_000_000),
  isCod: z.boolean().default(false),
  courierCode: z.string().trim().max(80).optional(),
});

export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;
export type GetOrderInput = z.infer<typeof getOrderInputSchema>;
export type GetTrackingStatusInput = z.infer<typeof getTrackingStatusInputSchema>;
export type QuoteShippingInput = z.infer<typeof quoteShippingInputSchema>;
