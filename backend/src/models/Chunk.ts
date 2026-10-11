import { DataTypes, Model, Optional } from "sequelize";
import type pgvectorSequelize from "pgvector/sequelize" with {
  "resolution-mode": "import",
};
require("pgvector/sequelize");
import sequelize from "../config/database";

interface ChunkData {
  id: number;
  storeId: number;
  documentId: number;
  content: string;
  embedding: number[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ChunkCreationAttributes
  extends Optional<
    ChunkData,
    "id" | "embedding" | "createdAt" | "updatedAt"
  > {}

class Chunk extends Model<ChunkData, ChunkCreationAttributes> {
  declare id: number;
  declare storeId: number;
  declare documentId: number;
  declare content: string;
  declare embedding: number[] | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Chunk.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },

    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    documentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    embedding: {
      type: DataTypes.VECTOR(1536),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "chunks",
    timestamps: true,
  }
);

export default Chunk;