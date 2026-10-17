import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

type AgentLogStatus = "success" | "error";

interface AgentLogData {
  id: number;
  storeId: number;
  agentName: string;
  action: string;
  status: AgentLogStatus;
  conversationId?: number | null;
  messageId?: number | null;
  toolsCalled?: Array<Record<string, unknown>>;
  ragSources?: Array<Record<string, unknown>>;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  latencyMs?: number | null;
  refusalCategory?: string | null;
  input?: string | null;
  output?: string | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class AgentLog extends Model<
  AgentLogData,
  Optional<AgentLogData, "id">
> {
  declare id: number;
  declare storeId: number;
  declare agentName: string;
  declare action: string;
  declare status: AgentLogStatus;
  declare conversationId: number | null;
  declare messageId: number | null;
  declare toolsCalled: Array<Record<string, unknown>>;
  declare ragSources: Array<Record<string, unknown>>;
  declare tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  declare latencyMs: number | null;
  declare refusalCategory: string | null;
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
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    toolsCalled: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    ragSources: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    tokenUsage: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    latencyMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    refusalCategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    input: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    output: {
      type: DataTypes.JSONB,
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
      {
        fields: ["storeId", "conversationId", "createdAt"],
        name: "agent_logs_storeId_conversationId_createdAt_index",
      },
    ],
  }
);

export default AgentLog;
