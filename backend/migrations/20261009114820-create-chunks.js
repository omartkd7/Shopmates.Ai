"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS vector;'
    );

    await queryInterface.createTable("chunks", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      storeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "stores",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      documentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "documents",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "chunks" ADD COLUMN "embedding" vector(1536);'
    );

    await queryInterface.addIndex(
      "chunks",
      ["storeId", "documentId"],
      { name: "chunks_storeId_documentId_index" }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("chunks");
  },
};