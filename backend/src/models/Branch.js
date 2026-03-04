import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Branch = sequelize.define(
  "Branch",
  {
    id:        { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name:      { type: DataTypes.STRING(140), allowNull: false },
    code:      { type: DataTypes.STRING(20),  allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "branches",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Branch;