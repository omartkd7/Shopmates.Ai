

import { DataTypes, Model,  } from "sequelize";
import sequelize from "../config/database";

interface StoreData {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}


class Store
  extends Model<StoreData>

  //  implements UserData

  {
  declare id: number;
  declare name: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Store.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "stores",
    timestamps: true,
  }
);

export default Store;