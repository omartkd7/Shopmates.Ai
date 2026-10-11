import { Router } from "express";
import { DEMO_STORE_NAME } from "../config/demo";
import { Product, Store, forStore } from "../models";

const productsRouter = Router();

productsRouter.get("/", async (_request, response) => {
  try {
    const store = await Store.findOne({ where: { name: DEMO_STORE_NAME } });
    if (!store) {
      return response.status(404).json({ error: "Demo catalog is not seeded" });
    }

    const products = await forStore(Product, store.id).findAll({
      attributes: ["id", "name", "description", "price", "stock", "sku", "categoryId"],
      include: [
        {
          association: Product.associations.category,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [["id", "ASC"]],
    });

    return response.json({
      store: { id: store.id, name: store.name },
      products,
    });
  } catch (error) {
    console.error("Failed to load demo products:", error);
    return response.status(500).json({ error: "Unable to load demo products" });
  }
});

export default productsRouter;