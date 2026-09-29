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

export const customerOrderHistoryInputSchema = z.object({
  mobile: z.string().trim().min(10).max(20),
});

export const getShippingLabelInputSchema = z.object({
  orderId: orderIdSchema,
  format: z.enum(['standard', 'thermal', 'a5', 'r4']).optional(),
});

export const prepareShipmentInputSchema = z
  .object({
    recipient: z.object({
      name: z.string().trim().min(1).max(120),
      mobile: z.string().trim().min(10).max(20),
      address: z.string().trim().min(5).max(500),
      city: z.string().trim().min(1).max(80),
      state: z.string().trim().min(1).max(80),
      pincode: z.string().trim().regex(/^\d{6}$/, 'pincode must be 6 digits'),
      country: z.string().trim().min(1).max(60).default('India'),
    }),
    package: z.object({
      weightGrams: z.number().positive().max(50000),
      packageValueInr: z.number().positive().max(1_000_000),
      totalItems: z.number().int().min(1).max(1000).default(1),
      description: z.string().trim().max(200).optional(),
    }),
    payment: z.object({
      mode: z.enum(['prepaid', 'cod']),
      codAmountInr: z.number().positive().max(1_000_000).optional(),
    }),
    courierCode: z.string().trim().min(1).max(80),
    pickupLocation: z.string().trim().min(1).max(120),
    referenceNumber: z.string().trim().max(60).optional(),
    reseller: z
      .object({ name: z.string().trim().max(120).optional(), mobile: z.string().trim().max(20).optional() })
      .optional(),
  })
  .refine((value) => value.payment.mode !== 'cod' || value.payment.codAmountInr !== undefined, {
    message: 'codAmountInr is required for cash on delivery',
    path: ['payment', 'codAmountInr'],
  });

export const createShipmentInputSchema = z.object({
  previewId: z.string().trim().min(1).max(80),
});

export const getShipmentOperationInputSchema = z.object({
  operationId: z.string().trim().min(1).max(80),
});

export type PrepareShipmentInput = z.infer<typeof prepareShipmentInputSchema>;

export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;
export type GetOrderInput = z.infer<typeof getOrderInputSchema>;
export type GetTrackingStatusInput = z.infer<typeof getTrackingStatusInputSchema>;
export type QuoteShippingInput = z.infer<typeof quoteShippingInputSchema>;
export type CustomerOrderHistoryInput = z.infer<typeof customerOrderHistoryInputSchema>;
export type GetShippingLabelInput = z.infer<typeof getShippingLabelInputSchema>;
