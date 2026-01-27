import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionStatementItem = sequelize.define(
  "CommissionStatementItem",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    run_id: { type: DataTypes.BIGINT, allowNull: false },
    sale_id: { type: DataTypes.BIGINT, allowNull: false },

    vehicle_id: { type: DataTypes.BIGINT, allowNull: false },
    tier_id: { type: DataTypes.BIGINT, allowNull: true },

    rate_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    notes: { type: DataTypes.STRING(255), allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "commission_run_items",
    timestamps: false,
    indexes: [
      { name: "uniq_run_sale", unique: true, fields: ["run_id", "sale_id"] },
      { name: "idx_item_run", fields: ["run_id"] },
      { name: "idx_item_sale", fields: ["sale_id"] },
      { name: "idx_item_vehicle", fields: ["vehicle_id"] },
      { name: "idx_item_tier", fields: ["tier_id"] },
    ],
  }
);

export default CommissionStatementItem;
