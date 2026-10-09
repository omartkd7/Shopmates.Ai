
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

type AgentLogStatus = "success" | "error";

interface AgentLogData {
  id: number;
  storeId: number;
  agentName: string;
  action: string;
  status: AgentLogStatus;
  input?: string | null;
  output?: string | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}



class AgentLog extends Model<
  AgentLogData
  
> {
  declare id: number;
  declare storeId: number;
  declare agentName: string;
  declare action: string;
  declare status: AgentLogStatus;
  declare input: string | null;
  declare output: string | null;
  declare errorMessage: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AgentLog.init(
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
    agentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("success", "error"),
      allowNull: false,
      defaultValue: "success",
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "agent_logs",
    timestamps: true,
    indexes: [
      {
        fields: ["storeId", "createdAt"],
      },
      {
        fields: ["storeId", "status"],
      },
    ],
  }
);

export default AgentLog;
