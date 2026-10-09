import {DataTypes, Model, } from "sequelize";
import sequelize from "../config/database";

interface CategoryData {
     id: number;
  storeId: number;
  name: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Category extends Model<CategoryData> {

    declare id: number;
  declare storeId: number;
  declare name: string;
  declare description?: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

}

Category.init(
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

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "categories",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["storeId", "name"],
      },
    ],
  }
);

export default Category;

