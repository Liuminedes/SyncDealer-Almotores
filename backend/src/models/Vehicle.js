import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Vehicle = sequelize.define(
  "Vehicle",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id: { type: DataTypes.BIGINT, allowNull: false },

    // Código único por marca (ej: YB1M50__25H1000 o lo que uses)
    code: { type: DataTypes.STRING(60), allowNull: false },

    model: { type: DataTypes.STRING(80), allowNull: false },
    version: { type: DataTypes.STRING(80), allowNull: false },

    model_year: { type: DataTypes.INTEGER, allowNull: true },

    // 🔥 Precio comercial actual (clave para tu requerimiento)
    sale_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },

    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "vehicles",
    timestamps: false,
    indexes: [
      {
        name: "uq_vehicle_brand_code",
        unique: true,
        fields: ["brand_id", "code"],
      },
      { name: "idx_vehicle_brand", fields: ["brand_id"] },
      { name: "idx_vehicle_code", fields: ["code"] },
    ],
  }
);

export default Vehicle;
