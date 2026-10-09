import {DataTypes, Model, } from "sequelize";
import sequelize from "../config/database";

interface RefreshTokenData {

    id: number;
    userId: number;
    token: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

class RefreshToken extends Model<RefreshTokenData> {

     declare id: number;
  declare storeId: number;
  declare userId: number;
  declare token: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}


RefreshToken.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: "refresh_tokens",
  timestamps: true,
});


export default RefreshToken;

