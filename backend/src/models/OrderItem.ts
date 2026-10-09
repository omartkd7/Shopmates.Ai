
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

interface OrderItemData {
  id: number;
  storeId: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number | string;
  createdAt?: Date;
  updatedAt?: Date;
}


class OrderItem extends Model<
  OrderItemData
  
> {
  declare id: number;
  declare storeId: number;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare unitPrice: number | string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrderItem.init(
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
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "order_items",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId", "orderId"],
      },
      {
        fields: ["storeId", "productId"],
      },
    ],
  }
);

export default OrderItem;
