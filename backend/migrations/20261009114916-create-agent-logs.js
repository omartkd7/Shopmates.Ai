"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("agent_logs", {
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

      agentName: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      input: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      output: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex(
      "agent_logs",
      ["storeId", "createdAt"],
      { name: "agent_logs_storeId_createdAt_index" }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("agent_logs");
  },
};