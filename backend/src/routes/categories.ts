import { Router, Request, Response, NextFunction } from "express";
import { Category, forStore } from "../models";
import {
  authenticate,
  injectTenant,
  requireRole,
  resolveStoreTenant,
  validate,
} from "../middlewares";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/category";

const categoriesRouter = Router();

/**
 * GET /api/categories
 * List all categories for the current store.
 * Scoped by storeId.
 */
categoriesRouter.get(
  "/",
  resolveStoreTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const categories = await forStore(Category, storeId).findAll({
        order: [["name", "ASC"]],
      });

      return res.json({ categories });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/categories/:id
 * Retrieve a single category.
 * Scoped by storeId.
 */
categoriesRouter.get(
  "/:id",
  resolveStoreTenant,
  validate(categoryIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const categoryId = Number(req.params.id);

      const category = await forStore(Category, storeId).findOne({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json({ category });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/categories
 * Create a new category (ADMIN only).
 * Scoped by storeId.
 */
categoriesRouter.post(
  "/",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(createCategorySchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const { name, description } = req.body;

      // Check unique category name within this store
      const existing = await forStore(Category, storeId).findOne({
        where: { name },
      });

      if (existing) {
        return res
          .status(409)
          .json({ error: "Category already exists in this store" });
      }

      const category = await Category.create({
        name,
        description: description || null,
        storeId,
      });

      return res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/categories/:id
 * Update category (ADMIN only).
 * Scoped by storeId.
 */
categoriesRouter.put(
  "/:id",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const categoryId = Number(req.params.id);

      const category = (await forStore(Category, storeId).findOne({
        where: { id: categoryId },
      })) as Category | null;

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Check name uniqueness if updated
      if (req.body.name && req.body.name !== category.name) {
        const existing = await forStore(Category, storeId).findOne({
          where: { name: req.body.name },
        });

        if (existing) {
          return res
            .status(409)
            .json({ error: "Category name already in use in this store" });
        }
      }

      await category.update({
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.description !== undefined
          ? { description: req.body.description }
          : {}),
      });

      return res.json({
        message: "Category updated successfully",
        category,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete category (ADMIN only).
 * Scoped by storeId.
 */
categoriesRouter.delete(
  "/:id",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  validate(categoryIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const categoryId = Number(req.params.id);

      const category = (await forStore(Category, storeId).findOne({
        where: { id: categoryId },
      })) as Category | null;

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      await category.destroy();

      return res.json({ message: "Category deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default categoriesRouter;
