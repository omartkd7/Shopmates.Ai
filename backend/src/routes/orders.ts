import { Router, Request, Response, NextFunction } from "express";
import sequelize from "../config/database";
import { Customer, Order, OrderItem, Product, forStore } from "../models";
import { authenticate, injectTenant, requireRole, validate } from "../middlewares";
import {
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
} from "../schemas/order";

const ordersRouter = Router();

// All order routes require authentication and store tenant injection
ordersRouter.use(authenticate, injectTenant);

/**
 * Helper: Find or create the Customer record corresponding to the authenticated User.
 */
async function resolveCustomer(storeId: number, email: string, name?: string) {
  const [customer] = await Customer.findOrCreate({
    where: { storeId, email },
    defaults: {
      storeId,
      email,
      name: name || email.split("@")[0],
    },
  });
  return customer;
}

/**
 * POST /api/orders (COD)
 * Validates items, checks stock, decrements stock, and creates Order + OrderItems
 * all within a single ACID transaction with row-level locking (concurrency-safe).
 */
ordersRouter.post(
  "/",
  validate(createOrderSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;
      const { items, customerName, customerPhone } = req.body as CreateOrderInput;

      const customer = await resolveCustomer(
        storeId,
        user.email,
        customerName || user.email.split("@")[0]
      );

      if (customerPhone && customer.phone !== customerPhone) {
        await customer.update({ phone: customerPhone });
      }

      // Execute in a database transaction with exclusive row-level locking
      const result = await sequelize.transaction(async (t) => {
        let total = 0;
        const orderItemsData: Array<{
          storeId: number;
          customerId: number;
          productId: number;
          quantity: number;
          unitPrice: number;
        }> = [];

        // Check stock and lock product rows
        for (const item of items) {
          const product = (await Product.findOne({
            where: { id: item.productId, storeId },
            transaction: t,
            lock: t.LOCK.UPDATE, // Exclusive lock: guarantees concurrency safety
          })) as Product | null;

          if (!product) {
            const err = new Error(`Product #${item.productId} not found in this store`);
            (err as any).statusCode = 404;
            throw err;
          }

          if (product.stock < item.quantity) {
            const err = new Error(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
            );
            (err as any).statusCode = 400;
            throw err;
          }

          const unitPrice = Number(product.price);
          total += unitPrice * item.quantity;

          // Decrement stock
          await product.decrement("stock", { by: item.quantity, transaction: t });

          orderItemsData.push({
            storeId,
            customerId: customer.id,
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
          });
        }

        // Create Order
        const order = await Order.create(
          {
            storeId,
            customerId: customer.id,
            status: "PENDING",
            total,
          },
          { transaction: t }
        );

        // Create OrderItems
        const createdItems = await OrderItem.bulkCreate(
          orderItemsData.map((data) => ({
            ...data,
            orderId: order.id,
          })),
          { transaction: t }
        );

        return { order, items: createdItems };
      });

      return res.status(201).json({
        message: "Order placed successfully (Cash on Delivery)",
        order: result.order,
        items: result.items,
      });
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * GET /api/orders
 * Returns orders for the current customer only.
 * Admins can view all orders for the store.
 */
ordersRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;

      if (user.role === "CUSTOMER") {
        const customer = await Customer.findOne({
          where: { storeId, email: user.email },
        });

        if (!customer) {
          return res.json({ orders: [] });
        }

        const orders = await forStore(Order, storeId).findAll({
          where: { customerId: customer.id },
          include: [
            {
              association: "items",
              include: [
                {
                  association: "product",
                  attributes: ["id", "name", "price", "sku"],
                },
              ],
            },
          ],
          order: [["createdAt", "DESC"]],
        });

        return res.json({ orders });
      }

      // ADMIN role: View all store orders
      const orders = await forStore(Order, storeId).findAll({
        include: [
          {
            association: "items",
            include: [
              {
                association: "product",
                attributes: ["id", "name", "price", "sku"],
              },
            ],
          },
          {
            association: "customer",
            attributes: ["id", "name", "email", "phone"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/orders/:id
 * Retrieve single order details. Customers can only view their own order.
 */
ordersRouter.get(
  "/:id",
  validate(orderIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;
      const orderId = Number(req.params.id);

      const order = (await forStore(Order, storeId).findOne({
        where: { id: orderId },
        include: [
          {
            association: "items",
            include: [
              {
                association: "product",
                attributes: ["id", "name", "price", "sku"],
              },
            ],
          },
          {
            association: "customer",
            attributes: ["id", "name", "email", "phone"],
          },
        ],
      })) as Order | null;

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Guardrail: customers can only view their own orders
      if (user.role === "CUSTOMER") {
        const customer = await Customer.findOne({
          where: { storeId, email: user.email },
        });

        if (!customer || order.customerId !== customer.id) {
          return res.status(404).json({ error: "Order not found" });
        }
      }

      return res.json({ order });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancels order and restores product stock inside a database transaction.
 * Customers can only cancel their own orders.
 */
ordersRouter.post(
  "/:id/cancel",
  validate(orderIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const user = req.user!;
      const orderId = Number(req.params.id);

      const cancelledOrder = await sequelize.transaction(async (t) => {
        const order = (await Order.findOne({
          where: { id: orderId, storeId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        })) as Order | null;

        if (!order) {
          const err = new Error("Order not found");
          (err as any).statusCode = 404;
          throw err;
        }

        // Ownership verification for customers
        if (user.role === "CUSTOMER") {
          const customer = await Customer.findOne({
            where: { storeId, email: user.email },
            transaction: t,
          });

          if (!customer || order.customerId !== customer.id) {
            const err = new Error("Order not found");
            (err as any).statusCode = 404;
            throw err;
          }
        }

        if (order.status === "CANCELLED") {
          const err = new Error("Order is already cancelled");
          (err as any).statusCode = 400;
          throw err;
        }

        if (order.status === "SHIPPED" || order.status === "DELIVERED") {
          const err = new Error(
            `Cannot cancel an order that has already been ${order.status.toLowerCase()}`
          );
          (err as any).statusCode = 400;
          throw err;
        }

        // Retrieve items for this order
        const items = await OrderItem.findAll({
          where: { orderId: order.id, storeId },
          transaction: t,
        });

        // Restore stock for all items
        for (const item of items) {
          const product = (await Product.findOne({
            where: { id: item.productId, storeId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          })) as Product | null;

          if (product) {
            await product.increment("stock", {
              by: item.quantity,
              transaction: t,
            });
          }
        }

        await order.update({ status: "CANCELLED" }, { transaction: t });

        return order;
      });

      return res.json({
        message: "Order cancelled successfully and stock restored",
        order: cancelledOrder,
      });
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/orders/:id/status
 * Update order status (ADMIN only).
 * If transitioning to CANCELLED, stock is safely restored in a transaction.
 */
ordersRouter.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.storeId as number;
      const orderId = Number(req.params.id);
      const { status: newStatus } = req.body as UpdateOrderStatusInput;

      const updatedOrder = await sequelize.transaction(async (t) => {
        const order = (await Order.findOne({
          where: { id: orderId, storeId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        })) as Order | null;

        if (!order) {
          const err = new Error("Order not found");
          (err as any).statusCode = 404;
          throw err;
        }

        // If transitioning from non-cancelled to CANCELLED, restore stock
        if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
          const items = await OrderItem.findAll({
            where: { orderId: order.id, storeId },
            transaction: t,
          });

          for (const item of items) {
            const product = (await Product.findOne({
              where: { id: item.productId, storeId },
              transaction: t,
              lock: t.LOCK.UPDATE,
            })) as Product | null;

            if (product) {
              await product.increment("stock", {
                by: item.quantity,
                transaction: t,
              });
            }
          }
        }

        await order.update({ status: newStatus }, { transaction: t });
        return order;
      });

      return res.json({
        message: `Order status updated to ${newStatus}`,
        order: updatedOrder,
      });
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

export default ordersRouter;
