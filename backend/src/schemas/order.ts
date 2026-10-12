import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.coerce.number().int().positive("Product ID must be a positive integer"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, "Order must contain at least one product"),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  shippingAddress: z.string().trim().optional(),
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Order ID must be a positive integer"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
