import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderData {
  id: number;
  storeId: number;
  customerId: number;
  status: OrderStatus | string;
  total: number | string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Order extends Model<OrderData, Optional<OrderData, "id" | "status" | "total">> {
  declare id: number;
  declare storeId: number;
  declare customerId: number;
  declare status: OrderStatus | string;
  declare total: number | string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Order.init(
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
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "PENDING",
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "orders",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId"],
      },
      {
        fields: ["customerId"],
      },
      {
        fields: ["storeId", "status"],
      },
    ],
  }
);

export default Order;
