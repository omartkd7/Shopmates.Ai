import {DataTypes, Model,} from "sequelize";
import sequelize from "../config/database";

interface ProductData {
    
 id: number;
  storeId: number;
  categoryId: number | null;
  name: string;
  description?: string | null;
  price: number | string;
  sku?: string | null;
  stock: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Product extends Model<ProductData> {

    declare id: number;
  declare storeId: number;
  declare categoryId: number | null;
  declare name: string;
  declare description: string | null;
  declare price: number | string;
  declare sku: string | null;
  declare stock: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

}

Product.init(
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
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "products",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId"],
      },
      {
        fields: ["categoryId"],
      },
      {
        unique: true,
        fields: ["storeId", "sku"],
      },
    ],
  }
);

export default Product;