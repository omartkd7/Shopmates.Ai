"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("agent_logs", "conversationId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "conversations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("agent_logs", "messageId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "messages", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("agent_logs", "toolsCalled", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn("agent_logs", "ragSources", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn("agent_logs", "tokenUsage", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn("agent_logs", "latencyMs", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("agent_logs", "refusalCategory", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addIndex("agent_logs", ["storeId", "conversationId", "createdAt"], {
      name: "agent_logs_storeId_conversationId_createdAt_index",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("agent_logs", "agent_logs_storeId_conversationId_createdAt_index");
    for (const column of [
      "refusalCategory",
      "latencyMs",
      "tokenUsage",
      "ragSources",
      "toolsCalled",
      "messageId",
      "conversationId",
    ]) {
      await queryInterface.removeColumn("agent_logs", column);
    }
  },
};
