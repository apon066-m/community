import { z } from "zod";

import { catalogSlugSchema } from "./catalog";
import { listQuerySchema } from "./list-query";

export const orderChannelOptions = ["online", "pos"] as const;
export const orderStatusOptions = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export const orderSortOptions = [
  "createdAt",
  "updatedAt",
  "orderNumber",
  "status",
] as const;
export const paymentMethodOptions = ["cash", "digital"] as const;
export const paymentStatusOptions = ["unpaid", "paid"] as const;
export const orderItemSizeOptions = ["small", "medium", "large"] as const;
export const orderItemTemperatureOptions = ["hot", "iced"] as const;

export type OrderChannel = (typeof orderChannelOptions)[number];
export type OrderStatus = (typeof orderStatusOptions)[number];
export type OrderSort = (typeof orderSortOptions)[number];
export type PaymentMethod = (typeof paymentMethodOptions)[number];
export type PaymentStatus = (typeof paymentStatusOptions)[number];
export type OrderItemSize = (typeof orderItemSizeOptions)[number];
export type OrderItemTemperature =
  (typeof orderItemTemperatureOptions)[number];

const orderIdSchema = z
  .string({ error: "Order ID is required" })
  .trim()
  .min(1, "Order ID is required")
  .max(120, "Order ID is too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Order ID must contain letters, numbers, hyphens, or underscores only",
  );

const customerIdSchema = z
  .string({ error: "Customer ID must be a string" })
  .trim()
  .min(1, "Customer ID cannot be empty")
  .max(120, "Customer ID is too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Customer ID must contain letters, numbers, hyphens, or underscores only",
  );

export const orderCallNameSchema = z
  .string({ error: "Call name must be a string" })
  .trim()
  .min(1, "Call name is required")
  .max(60, "Call name cannot be longer than 60 characters")
  .regex(
    /^[\p{L}\p{N} .'-]+$/u,
    "Call name can only contain letters, numbers, spaces, apostrophes, periods, and hyphens",
  );

export const paymentReferenceSchema = z
  .string({ error: "Payment reference must be a string" })
  .trim()
  .min(2, "Payment reference is required")
  .max(80, "Payment reference cannot be longer than 80 characters")
  .regex(
    /^[A-Za-z0-9 _/#.-]+$/,
    "Payment reference contains unsupported characters",
  );

export const guestOrderTokenSchema = z
  .string({ error: "Guest order token is required" })
  .trim()
  .min(32, "Guest order token is invalid")
  .max(128, "Guest order token is invalid")
  .regex(/^[A-Za-z0-9_-]+$/, "Guest order token is invalid");

export const createOrderLineSchema = z.object({
  itemSlug: catalogSlugSchema,
  quantity: z
    .number({ error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least one")
    .max(100, "Quantity cannot be greater than 100"),
  size: z.enum(orderItemSizeOptions).optional(),
  temperature: z.enum(orderItemTemperatureOptions).optional(),
});

export const createOrderSchema = z.object({
  lines: z
    .array(createOrderLineSchema)
    .min(1, "At least one order item is required")
    .max(50, "An order cannot contain more than 50 line items"),
  channel: z.enum(orderChannelOptions).default("online"),
  customerId: customerIdSchema.optional(),
  callName: orderCallNameSchema.optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Order notes cannot be longer than 500 characters")
    .optional(),
});

export const guestCreateOrderSchema = createOrderSchema
  .omit({ customerId: true })
  .extend({
    channel: z.literal("online"),
    callName: orderCallNameSchema,
  });

export const orderListQuerySchema = listQuerySchema.extend({
  sort: z.enum(orderSortOptions).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(orderStatusOptions).optional(),
  channel: z.enum(orderChannelOptions).optional(),
});

export const orderIdParamsSchema = z.object({
  orderId: orderIdSchema,
});

export const guestOrderTokenParamsSchema = z.object({
  guestToken: guestOrderTokenSchema,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusOptions),
});

export const cancelOrderSchema = z.object({});

export const checkoutOrderSchema = z.object({
  paymentMethod: z.enum(paymentMethodOptions),
  amountTenderedMinor: z
    .number({ error: "Amount tendered must be a number" })
    .int("Amount tendered must be a whole number")
    .min(0, "Amount tendered cannot be negative")
    .max(1_000_000_000_000, "Amount tendered is too high")
    .optional(),
  paymentReference: paymentReferenceSchema.optional(),
}).superRefine((input, context) => {
  if (input.paymentMethod === "digital" && !input.paymentReference) {
    context.addIssue({
      code: "custom",
      path: ["paymentReference"],
      message: "A payment reference is required for digital payments",
    });
  }
});

const orderCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const orderItemResponseSchema = z.object({
  id: z.string(),
  catalogItemId: z.string(),
  itemSlug: catalogSlugSchema,
  name: z.string(),
  quantity: z.number().int(),
  size: z.enum(orderItemSizeOptions).nullable(),
  temperature: z.enum(orderItemTemperatureOptions).nullable(),
  unitPriceMinor: z.number().int(),
  lineTotalMinor: z.number().int(),
  currency: z.string(),
});

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  callName: orderCallNameSchema.nullable(),
  channel: z.enum(orderChannelOptions),
  status: z.enum(orderStatusOptions),
  currency: z.string(),
  subtotalMinor: z.number().int(),
  totalMinor: z.number().int(),
  notes: z.string().nullable(),
  customer: orderCustomerSchema.nullable(),
  items: z.array(orderItemResponseSchema),
  payment: z.object({
    status: z.enum(paymentStatusOptions),
    method: z.enum(paymentMethodOptions).nullable(),
    reference: z.string().nullable(),
    amountTenderedMinor: z.number().int().nullable(),
    changeMinor: z.number().int(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  cancelledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const orderResponseSchema = z.object({
  order: orderSchema,
});

export const guestOrderResponseSchema = orderResponseSchema.extend({
  guestToken: guestOrderTokenSchema,
});

export const orderListResponseSchema = z.object({
  items: z.array(orderSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type CreateOrderLineInput = z.infer<typeof createOrderLineSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type GuestCreateOrderInput = z.infer<typeof guestCreateOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type OrderIdParams = z.infer<typeof orderIdParamsSchema>;
export type GuestOrderTokenParams = z.infer<typeof guestOrderTokenParamsSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;
export type OrderItem = z.infer<typeof orderItemResponseSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type GuestOrderResponse = z.infer<typeof guestOrderResponseSchema>;
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;
