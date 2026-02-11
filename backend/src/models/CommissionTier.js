// backend/src/models/CommissionTier.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionTier = sequelize.define(
  "CommissionTier",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    scheme_id: { type: DataTypes.BIGINT, allowNull: false },

    // ✅ ilimitados (VARCHAR)
    tier_name: { type: DataTypes.STRING(60), allowNull: false },

    min_units: { type: DataTypes.INTEGER, allowNull: false },
    max_units: { type: DataTypes.INTEGER, allowNull: true },

    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

    /**
     * ✅ Atributo en JS: rate_percent
     * ✅ Columna real en BD: commission_rate_percent
     * (así NO rompes nada del frontend ni del controller)
     */
    rate_percent: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      field: "commission_rate_percent",
    },
  },
  {
    tableName: "commission_tiers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default CommissionTier;
