
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

interface ConversationData {
  id: number;
  storeId: number;
  userId: number;
  title: string;
  status: "active" | "archived";
  createdAt?: Date;
  updatedAt?: Date;
}


class Conversation extends Model<
  ConversationData
  
> {
  declare id: number;
  declare storeId: number;
  declare userId: number;
  declare title: string;
  declare status: "active" | "archived";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Conversation.init(
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "New conversation",
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    tableName: "conversations",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId", "userId"],
      },
      {
        fields: ["storeId", "status"],
      },
    ],
  }
);

export default Conversation;
