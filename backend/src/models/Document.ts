
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

type DocumentStatus = "pending" | "processing" | "completed" | "failed";

interface DocumentData {
  id: number;
  storeId: number;
  uploadedBy: number;
  name: string;
  fileUrl: string;
  mimeType: string;
  status: DocumentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}



class Document extends Model<
  DocumentData
  
> {
  declare id: number;
  declare storeId: number;
  declare uploadedBy: number;
  declare name: string;
  declare fileUrl: string;
  declare mimeType: string;
  declare status: DocumentStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Document.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed",
        "failed"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    sequelize,
    tableName: "documents",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId"],
      },
      {
        fields: ["storeId", "status"],
      },
    ],
  }
);

export default Document;
