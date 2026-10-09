
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

type MessageRole = "user" | "assistant" | "system";

interface MessageData {
  id: number;
  storeId: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}


class Message extends Model<
  MessageData
  
> {
  declare id: number;
  declare storeId: number;
  declare conversationId: number;
  declare role: MessageRole;
  declare content: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Message.init(
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
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "assistant", "system"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "messages",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId", "conversationId", "createdAt"],
      },
    ],
  }
);

export default Message;
