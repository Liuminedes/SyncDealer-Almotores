import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionPercentageTier = sequelize.define(
  "CommissionPercentageTier",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },

    scheme_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    tier_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    // % real (ej 0.8, 1.0, 1.25). NO es 0.008
    percentage: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "commission_percentage_tiers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["scheme_id", "tier_id"] },
      { fields: ["scheme_id"] },
      { fields: ["tier_id"] },
    ],
  }
);

export default CommissionPercentageTier;
