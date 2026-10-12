import { Router, Request, Response, NextFunction } from "express";
import { Op, WhereOptions } from "sequelize";
import { Product, Category, forStore } from "../models";
import {
  authenticate,
  injectTenant,
  requireRole,
  resolveStoreTenant,
  validate,
} from "../middlewares";
import {
  createProductSchema,
  productIdParamSchema,
  productQuerySchema,
  updateProductSchema,
  type ProductQueryInput,
} from "../schemas/product";

const productsRouter = Router();

/**
 * GET /api/products
 * Search, filter by category/price, and paginate products.
 * Scoped strictly by storeId.
 */
productsRouter.get(
  "/",
  resolveStoreTenant,
  validate(productQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const query = req.query as unknown as ProductQueryInput;

      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      const whereClause: any = {};

      // Keyword search on name or description (case-insensitive)
      const searchTerm = query.q || query.search;
      if (searchTerm) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } },
        ];
      }

      // Category filter
      if (query.categoryId) {
        whereClause.categoryId = query.categoryId;
      }

      // Price range filters
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        const priceFilter: any = {};
        if (query.minPrice !== undefined) {
          priceFilter[Op.gte] = query.minPrice;
        }
        if (query.maxPrice !== undefined) {
          priceFilter[Op.lte] = query.maxPrice;
        }
        whereClause.price = priceFilter;
      }

      const scopedProduct = forStore(Product, storeId);
      const { rows: products, count: total } = await scopedProduct.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: "category",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["id", "ASC"]],
        limit,
        offset,
      });

      return res.json({
        storeId,
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/products/:id/stock
 * Live stock and price directly from the database (never hallucinated).
 * Scoped by storeId.
 */
productsRouter.get(
  "/:id/stock",
  resolveStoreTenant,
  validate(productIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const productId = Number(req.params.id);

      const product = (await forStore(Product, storeId).findOne({
        where: { id: productId },
        attributes: ["id", "name", "price", "stock"],
      })) as Product | null;

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock: product.stock,
        inStock: product.stock > 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/products/:id
 * Retrieve single product details with category.
 * Scoped by storeId.
 */
productsRouter.get(
  "/:id",
  resolveStoreTenant,
  validate(productIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const productId = Number(req.params.id);

      const product = await forStore(Product, storeId).findOne({
        where: { id: productId },
        include: [
          {
            association: "category",
            attributes: ["id", "name", "description"],
            required: false,
          },
        ],
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json({ product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/products
 * Create product (ADMIN only).
 * storeId injected server-side from JWT.
 */
productsRouter.post(
  "/",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(createProductSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const { name, description, price, stock, sku, categoryId } = req.body;

      // Verify category belongs to this store if provided
      if (categoryId) {
        const category = await forStore(Category, storeId).findByPk(categoryId);
        if (!category) {
          return res.status(400).json({ error: "Category not found in this store" });
        }
      }

      // Check unique SKU per store if SKU provided
      if (sku) {
        const existingSku = await forStore(Product, storeId).findOne({
          where: { sku },
        });
        if (existingSku) {
          return res.status(409).json({ error: "SKU already exists in this store" });
        }
      }

      const product = await Product.create({
        name,
        description: description || null,
        price,
        stock: stock ?? 0,
        sku: sku || null,
        categoryId: categoryId || null,
        storeId,
      });

      return res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (ADMIN only).
 * Scoped by storeId.
 */
productsRouter.put(
  "/:id",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const productId = Number(req.params.id);

      const product = (await forStore(Product, storeId).findOne({
        where: { id: productId },
      })) as Product | null;

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Verify category belongs to this store if categoryId is updated
      if (req.body.categoryId) {
        const category = await forStore(Category, storeId).findByPk(
          req.body.categoryId
        );
        if (!category) {
          return res.status(400).json({ error: "Category not found in this store" });
        }
      }

      // Check unique SKU if sku is updated and different
      if (req.body.sku && req.body.sku !== product.sku) {
        const existingSku = await forStore(Product, storeId).findOne({
          where: { sku: req.body.sku },
        });
        if (existingSku) {
          return res.status(409).json({ error: "SKU already exists in this store" });
        }
      }

      await product.update({
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.description !== undefined
          ? { description: req.body.description }
          : {}),
        ...(req.body.price !== undefined ? { price: req.body.price } : {}),
        ...(req.body.stock !== undefined ? { stock: req.body.stock } : {}),
        ...(req.body.sku !== undefined ? { sku: req.body.sku } : {}),
        ...(req.body.categoryId !== undefined
          ? { categoryId: req.body.categoryId }
          : {}),
      });

      return res.json({
        message: "Product updated successfully",
        product,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (ADMIN only).
 * Scoped by storeId.
 */
productsRouter.delete(
  "/:id",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(productIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const productId = Number(req.params.id);

      const product = (await forStore(Product, storeId).findOne({
        where: { id: productId },
      })) as Product | null;

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      await product.destroy();

      return res.json({ message: "Product deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default productsRouter;