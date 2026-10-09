import { DataTypes, Model, } from "sequelize";
import sequelize from "../config/database";

interface UserData {
  id: number;
  storeId: number;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class User
  extends Model<UserData>
//  implements UserData
{
  declare id: number;
  declare storeId: number;
  declare name: string;
  declare email: string;
  declare password: string;
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
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["storeId", "email"],
      },
    ],
  }
);

export default User;
