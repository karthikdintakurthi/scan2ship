import type { Prisma, orders } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DelhiveryOutcomeUnknownError, DelhiveryService } from '@/lib/delhivery';
import { generateReferenceNumberWithPrefix, formatReferenceNumberWithPrefix } from '@/lib/reference-number';
import AnalyticsService from '@/lib/analytics-service';
import { CreditService, InsufficientCreditsError, type CreditCharge } from '@/lib/credit-service';
import { pickCreatableOrderFields } from '@/lib/application/order-fields';
import { WebhookService } from '@/lib/webhook-service';
import type { AuthenticatedUser } from '@/lib/auth-middleware';
import { claimDtdcSlip, claimListedDtdcSlip, isDtdcCourier, releaseDtdcSlip } from '@/lib/application/dtdc-slips';

const delhiveryService = new DelhiveryService();

export type CreateOrderResult =
  | { ok: true; order: orders }
  | { ok: false; status: 400 | 402 | 409 | 500 | 502; body: Record<string, unknown> };

function fail(status: 400 | 402 | 409 | 500 | 502, body: Record<string, unknown>): CreateOrderResult {
  return { ok: false, status, body };
}

function isValidIndianMobile(mobile: unknown): boolean {
  // Non-strings (e.g. a JSON number) are rejected rather than crashing
  if (typeof mobile !== 'string') return false;
  const cleanMobile = mobile.replace(/\D/g, '');
  // 10 digits starting 6-9, or the same with a 91 country code (optionally followed by 0)
  if (cleanMobile.length === 10) {
    return /^[6-9]\d{9}$/.test(cleanMobile);
  } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleanMobile.substring(2));
  } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleanMobile.substring(3));
  }
  return false;
}

const REQUIRED_ORDER_FIELDS = ['name', 'mobile', 'address', 'city', 'state', 'country', 'pincode', 'courier_service', 'pickup_location', 'package_value', 'weight', 'total_items'];

/** The checks createOrder runs before charging, for callers that validate ahead of time. */
export function validateOrderInput(orderData: Record<string, unknown>): CreateOrderResult | null {
  for (const field of REQUIRED_ORDER_FIELDS) {
    if (!orderData[field]) {
      return fail(400, { error: `Missing required field: ${field}` });
    }
  }
  if (!isValidIndianMobile(orderData.mobile)) {
    return fail(400, { error: 'Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9' });
  }
  if (orderData.reseller_mobile && !isValidIndianMobile(orderData.reseller_mobile)) {
    return fail(400, { error: 'Reseller mobile number must be exactly 10 digits and start with 6, 7, 8, or 9' });
  }
  return null;
}

/**
 * Creates an order for the caller's tenant: validates it, charges the order
 * credit, books the Delhivery waybill when the courier is Delhivery, saves the
 * order, and refunds the credit (and cancels an orphaned waybill) if a later
 * step fails. Shared by the website, and by any other channel that creates
 * orders, so they charge and book identically.
 *
 * The caller must have authenticated the user and checked they may create orders.
 */
export async function createOrder(
  user: AuthenticatedUser,
  orderData: Record<string, any>,
  options: {
    creationPattern?: string;
    /** DTDC orders without a tracking number take the next unused number from Settings */
    assignNextDtdcSlip?: boolean;
  } = {}
): Promise<CreateOrderResult> {
  const client = user.client;

  const orderCreditCost = CreditService.getCreditCost('ORDER');

  const invalid = validateOrderInput(orderData);
  if (invalid) {
    return invalid;
  }

  // Get client order configuration for reference number prefix
  const clientOrderConfig = await prisma.client_order_configs.findUnique({
    where: { clientId: client.id }
  });

  // Get user's sub-group name for the order
  let subGroupName = null;
  if (user.role === 'child_user') {
    try {
      const userSubGroup = await prisma.user_sub_groups.findFirst({
        where: { userId: user.id },
        select: {
          subGroups: {
            select: { name: true }
          }
        }
      });
      subGroupName = userSubGroup?.subGroups?.name || null;
    } catch (error) {
      console.error('Error fetching user sub-group for order creation:', error);
      subGroupName = null;
    }
  }

  // Generate or format reference number with prefix configuration
  let referenceNumber: string;
  if (orderData.reference_number && orderData.reference_number.trim()) {
    // Use custom reference value with mobile number and prefix configuration
    referenceNumber = formatReferenceNumberWithPrefix(
      orderData.reference_number.trim(), 
      orderData.mobile,
      clientOrderConfig?.enableReferencePrefix ?? true
      // No per-client prefix column exists; the helper's default ('REF') applies.
    );
  } else {
    // Auto-generate reference number with prefix configuration
    referenceNumber = generateReferenceNumberWithPrefix(
      orderData.mobile,
      clientOrderConfig?.enableReferencePrefix ?? true
      // No per-client prefix column exists; the helper's default ('REF') applies.
    );
  }

  const isDelhivery =
    typeof orderData.courier_service === 'string' && orderData.courier_service.toLowerCase() === 'delhivery';
  const { fields: creatableFields, ignored: ignoredFields } = pickCreatableOrderFields(orderData);
  if (isDelhivery) {
    delete creatableFields.tracking_id;
  }
  if (ignoredFields.length > 0) {
    console.log('📝 [ORDER_CREATE] Ignoring fields that cannot be set on create:', ignoredFields.join(', '));
  }

  // Convert string values to appropriate data types and map fields
  const processedOrderData: Record<string, any> = {
    ...creatableFields,
    package_value: parseFloat(orderData.package_value) || 0,
    weight: parseFloat(orderData.weight) || 0,
    total_items: parseInt(orderData.total_items) || 1,
    cod_amount: orderData.cod_amount ? parseFloat(orderData.cod_amount) : null,
    // Delhivery waybills come from the carrier, not the caller
    tracking_id: isDelhivery ? null : (orderData.waybill || orderData.tracking_id || null),
    reference_number: referenceNumber,
    clientId: client.id,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Handle products field - convert to JSON if present
  if (orderData.products && Array.isArray(orderData.products)) {
    console.log('🔍 [ORDER_CREATE] Products data received:', orderData.products);
    processedOrderData.products = JSON.stringify(orderData.products);
    console.log('🔍 [ORDER_CREATE] Products data saved as JSON:', processedOrderData.products);
  }
  
  // Apply user's custom from address for this courier (overrides profile/address when order uses selected courier)
  const customFrom = await prisma.user_custom_from_address.findUnique({
    where: { userId: user.id }
  });
  if (
    customFrom?.overwriteFromAddress &&
    customFrom.courierServiceCode &&
    customFrom.customAddress &&
    orderData.courier_service &&
    String(orderData.courier_service).toLowerCase() === customFrom.courierServiceCode.toLowerCase()
  ) {
    processedOrderData.seller_address = customFrom.customAddress;
    console.log('📋 [ORDER_CREATE] Using custom from address for courier:', orderData.courier_service);
  }

  // Log the processed data for debugging
  console.log('🔍 [ORDER_CREATE] Processed order data:', processedOrderData);

  // DTDC tracking numbers come from the account's list in Settings. Claim the
  // number here, on the server, so two orders can never get the same one; it is
  // released below if this order is not created.
  const courierCode = typeof orderData.courier_service === 'string' ? orderData.courier_service : '';
  let claimedSlip: string | null = null;
  if (isDtdcCourier(courierCode)) {
    const given = typeof processedOrderData.tracking_id === 'string' ? processedOrderData.tracking_id.trim() : '';
    if (given) {
      const claim = await claimListedDtdcSlip(client.id, courierCode, given);
      if (claim === 'already_used') {
        return fail(409, {
          error: `DTDC tracking number ${given} has already been used`,
          details: 'Use the next available number and try again.'
        });
      }
      if (claim === 'claimed') claimedSlip = given;
    } else if (options.assignNextDtdcSlip) {
      claimedSlip = await claimDtdcSlip(client.id, courierCode);
      if (claimedSlip) processedOrderData.tracking_id = claimedSlip;
    }
  }
  const releaseSlip = async () => {
    if (!claimedSlip) return;
    try {
      await releaseDtdcSlip(client.id, courierCode, claimedSlip);
    } catch (releaseError) {
      console.error('❌ [ORDER_CREATE] Could not return DTDC number to the unused list:', { slip: claimedSlip, releaseError });
    }
  };

  // Take the credit before booking so a shipment is never booked unpaid; refund it if the order is not created
  let charge: CreditCharge;
  try {
    charge = await CreditService.deductCredits(client.id, orderCreditCost, 'Order creation', 'ORDER', user.id);
  } catch (creditError) {
    await releaseSlip();
    if (creditError instanceof InsufficientCreditsError) {
      return fail(402, {
        error: 'Insufficient credits',
        details: `Order creation requires ${orderCreditCost} credits. Please contact your administrator to add more credits.`
      });
    }
    throw creditError;
  }

  /** Returns whether the credit was actually given back, so responses can say so truthfully. */
  const refundCharge = async (reason: string): Promise<boolean> => {
    try {
      await CreditService.refundCredits(client.id, orderCreditCost, `Refund: ${reason}`, 'ORDER', user.id);
      return true;
    } catch (refundError) {
      console.error('❌ [ORDER_CREATE] Credit refund failed; reconcile manually:', { transactionId: charge.transactionId, refundError });
      return false;
    }
  };

  // Handle Delhivery API call first if courier service is Delhivery (case-insensitive) and skip_tracking is not enabled
  let delhiveryResponse = null;
  if (orderData.courier_service && typeof orderData.courier_service === 'string' && orderData.courier_service.toLowerCase() === 'delhivery' && !orderData.skip_tracking) {
    try {
      console.log('🚚 [ORDER_CREATE] Calling Delhivery API before creating order');
      console.log('🚚 [ORDER_CREATE] Order data being sent to Delhivery:', JSON.stringify(processedOrderData, null, 2));
      console.log('🚚 [ORDER_CREATE] Pickup location:', processedOrderData.pickup_location);
      
      // Create a temporary order object for Delhivery API call
      const tempOrder = {
        ...processedOrderData,
        id: 0 // Temporary ID for API call
      };
      
      delhiveryResponse = await delhiveryService.createOrder(tempOrder);
      
      console.log('🚚 [ORDER_CREATE] Delhivery API response received:', JSON.stringify(delhiveryResponse, null, 2));
      
      if (!delhiveryResponse.success) {
        console.log('❌ [ORDER_CREATE] Delhivery API failed, not creating order');
        const creditRefunded = await refundCharge('Delhivery booking failed');
        return fail(400, {
          success: false,
          error: 'Delhivery API failed',
          details: delhiveryResponse.error || 'Failed to create order with Delhivery',
          delhiveryError: delhiveryResponse.error,
          creditRefunded
        });
      }
      
      console.log('✅ [ORDER_CREATE] Delhivery API succeeded, proceeding with order creation');
    } catch (error) {
      console.error('❌ [ORDER_CREATE] Delhivery API error:', error);
      console.error('❌ [ORDER_CREATE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof DelhiveryOutcomeUnknownError) {
        // Delhivery may have booked the shipment: keep the credit, save nothing,
        // and have someone check Delhivery before this order is placed again
        console.error('⚠️ [ORDER_CREATE] Delhivery booking outcome unknown; needs reconciliation:', {
          transactionId: charge.transactionId,
          reference: processedOrderData.reference_number,
        });
        return fail(502, {
          success: false,
          outcome: 'unknown',
          error: 'Delhivery did not confirm the booking',
          details:
            'The shipment may or may not have been created with Delhivery. Check Delhivery for this reference before creating the order again. The credit has not been refunded yet.',
          reference: processedOrderData.reference_number,
          transactionId: charge.transactionId,
        });
      }

      const creditRefunded = await refundCharge('Delhivery booking failed');
      return fail(400, {
        success: false,
        error: 'Delhivery API failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred while creating order with Delhivery',
        creditRefunded
      });
    }
  } else {
    if (orderData.courier_service && typeof orderData.courier_service === 'string' && orderData.courier_service.toLowerCase() === 'delhivery' && orderData.skip_tracking) {
      console.log('📝 [ORDER_CREATE] Skipping Delhivery API - skip_tracking enabled for Delhivery order');
    } else {
      console.log('📝 [ORDER_CREATE] Skipping Delhivery API for courier service:', orderData.courier_service);
    }
  }

  // Create order with client ID (only if Delhivery succeeded or not required)
  // Set tracking_status to 'pending' if no tracking ID is assigned
  const orderDataToCreate = {
    ...processedOrderData,
    created_by: user.id, // Track who created this order
    sub_group: subGroupName, // Track which sub-group the user belongs to
    tracking_status: processedOrderData.tracking_id ? null : 'pending'
  };
  
  let order: Awaited<ReturnType<typeof prisma.orders.create>> | undefined;
  try {
    order = await prisma.orders.create({
      data: orderDataToCreate as Prisma.ordersUncheckedCreateInput
    });

    console.log('✅ [ORDER_CREATE] Order created successfully:', order.id);

    // Update order with Delhivery data if available
    if (delhiveryResponse && delhiveryResponse.success) {
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          delhivery_waybill_number: delhiveryResponse.waybill_number,
          delhivery_order_id: delhiveryResponse.order_id,
          delhivery_api_status: 'success',
          tracking_status: 'manifested',
          tracking_id: delhiveryResponse.waybill_number,
          last_delhivery_attempt: new Date()
        }
      });

      console.log('✅ [ORDER_CREATE] Delhivery data updated in order');
    }
  } catch (saveError) {
    console.error('❌ [ORDER_CREATE] Failed to save order:', saveError);

    if (!order && delhiveryResponse?.success && delhiveryResponse.waybill_number) {
      // Do not leave a live waybill with no order row
      const cancelResult = await delhiveryService.cancelOrder(
        delhiveryResponse.waybill_number,
        processedOrderData.pickup_location,
        client.id
      );
      if (!cancelResult.success) {
        console.error('❌ [ORDER_CREATE] Waybill cancellation failed; reconcile manually:', {
          waybill: delhiveryResponse.waybill_number,
          error: cancelResult.error
        });
      }
    }

    if (!order) {
      const creditRefunded = await refundCharge('order could not be saved');
      await releaseSlip();
      return fail(500, { error: 'Failed to create order', creditRefunded });
    }

    // The order and any waybill exist and remain charged; only saving carrier details failed
    const createdOrderId = order.id;
    await CreditService.attachOrderToTransaction(charge.transactionId, createdOrderId).catch((ledgerError) =>
      console.error('❌ [ORDER_CREATE] Could not link credit charge to order:', { transactionId: charge.transactionId, orderId: createdOrderId, ledgerError })
    );
    return fail(500, {
      error: 'Order was created but its carrier details could not be saved',
      orderId: createdOrderId,
      waybill: delhiveryResponse?.waybill_number
    });
  }

  try {
    await CreditService.attachOrderToTransaction(charge.transactionId, order.id);
  } catch (ledgerError) {
    console.error('❌ [ORDER_CREATE] Could not link credit charge to order:', { transactionId: charge.transactionId, orderId: order.id, ledgerError });
  }

  // Track order creation analytics
  try {
    // Determine creation pattern from request body
    const creationPattern = options.creationPattern ?? orderData.creationPattern ?? 'manual';
    
    // Track order creation analytics
    await AnalyticsService.trackOrderCreation({
      orderId: order.id,
      clientId: user.clientId,
      userId: user.id,
      creationPattern
    });

    // Track create_order event
    await AnalyticsService.trackEvent({
      eventType: 'create_order',
      clientId: user.clientId,
      userId: user.id,
      eventData: {
        orderId: order.id,
        creationPattern,
        courierService: orderData.courier_service
      }
    });
    
    console.log('📊 [ORDER_CREATE] Order analytics tracked:', {
      orderId: order.id,
      pattern: creationPattern
    });
  } catch (analyticsError) {
    console.warn('⚠️ [ORDER_CREATE] Failed to track order analytics:', analyticsError);
  }

  // Fetch updated order data to get latest tracking number
  const updatedOrder = await prisma.orders.findUnique({
    where: { id: order.id }
  });

  if (!updatedOrder) {
    console.error('❌ [ORDER_CREATE] Failed to fetch updated order data');
    return fail(500, { error: 'Failed to fetch updated order data' });
  }


  // Trigger webhooks for order creation
  try {
    console.log('🔗 [ORDER_CREATE] Triggering webhooks for order creation');
    
    const webhookData = {
      order: {
        id: updatedOrder.id,
        orderNumber: `ORDER-${updatedOrder.id}`,
        referenceNumber: updatedOrder.reference_number,
        trackingId: updatedOrder.tracking_id,
        name: updatedOrder.name,
        mobile: updatedOrder.mobile,
        address: updatedOrder.address,
        city: updatedOrder.city,
        state: updatedOrder.state,
        country: updatedOrder.country,
        pincode: updatedOrder.pincode,
        courierService: updatedOrder.courier_service,
        pickupLocation: updatedOrder.pickup_location,
        packageValue: updatedOrder.package_value,
        weight: updatedOrder.weight,
        totalItems: updatedOrder.total_items,
        isCod: updatedOrder.is_cod,
        codAmount: updatedOrder.cod_amount,
        resellerName: updatedOrder.reseller_name,
        resellerMobile: updatedOrder.reseller_mobile,
        createdAt: updatedOrder.created_at,
        updatedAt: updatedOrder.updated_at,
        delhiveryWaybillNumber: updatedOrder.delhivery_waybill_number,
        delhiveryOrderId: updatedOrder.delhivery_order_id,
        delhiveryApiStatus: updatedOrder.delhivery_api_status
      },
      client: {
        id: client.id,
        companyName: client.id, // Using client ID as company name fallback
        name: client.id, // Using client ID as name fallback
        email: user.email // Using user email as fallback
      }
    };

    // Trigger webhook asynchronously to not block the response
    WebhookService.triggerWebhooks('order.created', webhookData, client.id, updatedOrder.id)
      .then(() => {
        console.log('✅ [ORDER_CREATE] Webhooks triggered successfully');
      })
      .catch((webhookError) => {
        console.error('❌ [ORDER_CREATE] Webhook trigger failed:', webhookError);
      });
  } catch (webhookError) {
    console.error('❌ [ORDER_CREATE] Webhook setup failed:', webhookError);
  }

  // updatedOrder includes the waybill and booking status saved after the carrier call
  return { ok: true, order: updatedOrder };
}
