import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Branch = sequelize.define(
  "Branch",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    brand_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "branches",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["brand_id", "code"] }],
  }
);

export default Branch;
