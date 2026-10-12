"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add role column to users table (default CUSTOMER)
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "CUSTOMER",
    });

    // 2. Remove the users_storeId_unique index so multiple users can register under the same store
    // (users_storeId_email_unique remains to enforce email uniqueness per store)
    try {
      await queryInterface.removeIndex("users", "users_storeId_unique");
    } catch {
      // index might already be removed or not present
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "role");
    await queryInterface.addIndex("users", ["storeId"], {
      unique: true,
      name: "users_storeId_unique",
    });
  },
};
