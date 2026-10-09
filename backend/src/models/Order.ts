
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

interface OrderData {
  id: number;
  storeId: number;
  customerId: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  total: number | string;
  createdAt?: Date;
  updatedAt?: Date;
}



class Order extends Model<OrderData> {
  declare id: number;
  declare storeId: number;
  declare customerId: number;
  declare status: "pending" | "processing" | "completed" | "cancelled";
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
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "pending",
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
