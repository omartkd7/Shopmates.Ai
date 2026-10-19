import { z } from "zod";

export const productQuerySchema = z.object({
  q: z.string().trim().optional(),
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Product ID must be a positive integer"),
});

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(255, "Product name is too long"),
  description: z.string().trim().optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), "Image URL must use HTTPS")
    .optional()
    .nullable(),
  price: z.coerce
    .number()
    .positive("Price must be greater than zero"),
  stock: z.coerce
    .number()
    .int()
    .min(0, "Stock cannot be negative")
    .default(0),
  sku: z.string().trim().max(100).optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
