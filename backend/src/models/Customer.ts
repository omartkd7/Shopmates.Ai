
import { DataTypes, Model,  } from "sequelize";
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
  CustomerData
  
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
        fields: ["storeId", "email"],
      },
    ],
  }
);

export default Customer;
