import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export type UserRole = "ADMIN" | "CUSTOMER";

interface UserData {
  id: number;
  storeId: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

class User
  extends Model<UserData, Optional<UserData, "id" | "role">>
{
  declare id: number;
  declare storeId: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: UserRole;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
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
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "CUSTOMER",
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["storeId", "email"],
        name: "users_storeId_email_unique",
      },
    ],
  }
);

export default User;
