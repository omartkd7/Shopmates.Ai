import { DataTypes, Model, Optional } from "sequelize";
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
      // Compatibility workaround for Sequelize v6.
      // The actual PostgreSQL column is vector(1536).
      type: DataTypes.TEXT,
      allowNull: true,

      get() {
        const raw = this.getDataValue("embedding") as unknown;

        if (raw == null) {
          return null;
        }

        if (Array.isArray(raw)) {
          return raw as number[];
        }

        if (typeof raw !== "string") {
          throw new Error("Unexpected embedding value returned by PostgreSQL");
        }

        const value = raw.trim();

        if (!value.startsWith("[") || !value.endsWith("]")) {
          throw new Error("Invalid pgvector embedding format");
        }

        const body = value.slice(1, -1).trim();

        if (!body) {
          return [];
        }

        return body.split(",").map((item) => {
          const number = Number(item);

          if (!Number.isFinite(number)) {
            throw new Error("Invalid number in embedding");
          }

          return number;
        });
      },

      set(value: number[] | null) {
        if (value == null) {
          this.setDataValue(
            "embedding",
            null as unknown as number[]
          );
          return;
        }

        if (
          !Array.isArray(value) ||
          value.length !== 1536 ||
          !value.every(Number.isFinite)
        ) {
          throw new Error(
            "Embedding must contain exactly 1536 finite numbers"
          );
        }

        const vectorString = `[${value.join(",")}]`;

        this.setDataValue(
          "embedding",
          vectorString as unknown as number[]
        );
      },
    },
  },
  {
    sequelize,
    tableName: "chunks",
    timestamps: true,
  }
);

export default Chunk;