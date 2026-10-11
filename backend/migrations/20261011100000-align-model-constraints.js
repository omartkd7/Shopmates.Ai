"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("users", "users_email_key");
    await queryInterface.addIndex("users", ["storeId", "email"], {
      unique: true,
      name: "users_storeId_email_unique",
    });
    await queryInterface.addIndex("users", ["storeId"], {
      unique: true,
      name: "users_storeId_unique",
    });

    await queryInterface.addIndex("orders", ["customerId", "id"], {
      unique: true,
      name: "orders_customerId_id_unique",
    });
    await queryInterface.addColumn("order_items", "customerId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      'UPDATE "order_items" AS item SET "customerId" = "orders"."customerId" FROM "orders" WHERE item."orderId" = "orders"."id"'
    );
    await queryInterface.changeColumn("order_items", "customerId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addConstraint("order_items", {
      fields: ["customerId", "orderId"],
      type: "foreign key",
      name: "order_items_customer_order_fkey",
      references: {
        table: "orders",
        fields: ["customerId", "id"],
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    await queryInterface.addIndex(
      "order_items",
      ["storeId", "customerId", "productId"],
      { name: "order_items_store_customer_product_index" }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "order_items",
      "order_items_customer_order_fkey"
    );
    await queryInterface.removeIndex(
      "order_items",
      "order_items_store_customer_product_index"
    );
    await queryInterface.removeColumn("order_items", "customerId");
    await queryInterface.removeIndex("orders", "orders_customerId_id_unique");

    await queryInterface.removeIndex("users", "users_storeId_unique");
    await queryInterface.removeIndex("users", "users_storeId_email_unique");
    await queryInterface.addConstraint("users", {
      fields: ["email"],
      type: "unique",
      name: "users_email_key",
    });
  },
};