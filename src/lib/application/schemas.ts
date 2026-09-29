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
    trackingNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{4,40}$/, 'trackingNumber must be 4-40 letters, digits, or hyphens')
      .optional(),
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

export const preparePickupInputSchema = z.object({
  pickupDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'pickupDate must be YYYY-MM-DD'),
  pickupTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'pickupTime must be 24-hour HH:MM'),
  expectedPackageCount: z.number().int().min(1).max(500),
  pickupLocations: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
});

export const schedulePickupInputSchema = z.object({
  previewId: z.string().trim().min(1).max(80),
});

export type PreparePickupInput = z.infer<typeof preparePickupInputSchema>;

export type PrepareShipmentInput = z.infer<typeof prepareShipmentInputSchema>;

export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;
export type GetOrderInput = z.infer<typeof getOrderInputSchema>;
export type GetTrackingStatusInput = z.infer<typeof getTrackingStatusInputSchema>;
export type QuoteShippingInput = z.infer<typeof quoteShippingInputSchema>;
export type CustomerOrderHistoryInput = z.infer<typeof customerOrderHistoryInputSchema>;
export type GetShippingLabelInput = z.infer<typeof getShippingLabelInputSchema>;
