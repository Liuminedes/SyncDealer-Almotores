import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const SchemeRule = sequelize.define("SchemeRule", {
  id:           { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  scheme_id:    { type: DataTypes.BIGINT, allowNull: false },
  name:         { type: DataTypes.STRING(120), allowNull: false },
  description:  { type: DataTypes.STRING(255), allowNull: true },
  conditions:   { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  effect_type:  { type: DataTypes.ENUM("FORCE_TIER", "FIXED_ADD", "FIXED_SUBTRACT"), allowNull: false },
  effect_value: { type: DataTypes.STRING(80), allowNull: false },
  is_active:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  priority:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  notes:        { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: "scheme_rules",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

export default SchemeRule;