import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionScheme = sequelize.define(
  "CommissionScheme",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id: { type: DataTypes.BIGINT, allowNull: false },

    name: { type: DataTypes.STRING(120), allowNull: false },

    // En tu BD hoy: enum('STANDARD','KIA_PLAN') (según tu screenshot)
    // Vamos a permitir strings para soportar RANGES/PERCENTAGES también (sin romper).
    scheme_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "STANDARD" },

    valid_from: { type: DataTypes.DATEONLY, allowNull: false },
    valid_to: { type: DataTypes.DATEONLY, allowNull: true },

    // En tu BD: enum('ACTIVE','INACTIVE')
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "ACTIVE" },

    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "commission_schemes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default CommissionScheme;
