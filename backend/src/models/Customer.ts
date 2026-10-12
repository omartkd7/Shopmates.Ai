
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface CustomerData {
  id: number;
  storeId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Customer extends Model<
  CustomerData,
  Optional<CustomerData, "id">
> {
  declare id: number;
  declare storeId: number;
  declare name: string;
  declare email: string | null;
  declare phone: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Customer.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "customers",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId"],
      },
      {
        unique: true,
        fields: ["storeId", "email"],
        name: "customers_storeId_email_unique",
      },
    ],
  }
);

export default Customer;
