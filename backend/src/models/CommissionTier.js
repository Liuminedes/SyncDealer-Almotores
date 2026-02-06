import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionTier = sequelize.define(
  "CommissionTier",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    scheme_id: { type: DataTypes.BIGINT, allowNull: false },

    // IMPORTANTE: para tiers infinitos debes haber cambiado en BD a VARCHAR
    tier_name: { type: DataTypes.STRING(60), allowNull: false },

    min_units: { type: DataTypes.INTEGER, allowNull: false },
    max_units: { type: DataTypes.INTEGER, allowNull: true },

    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: "commission_tiers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default CommissionTier;
