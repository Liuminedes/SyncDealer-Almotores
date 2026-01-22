import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Sale = sequelize.define(
  "Sale",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id: { type: DataTypes.BIGINT, allowNull: false },
    advisor_id: { type: DataTypes.BIGINT, allowNull: false },
    vehicle_id: { type: DataTypes.BIGINT, allowNull: false },

    sale_date: { type: DataTypes.DATEONLY, allowNull: false },

    // “Mes corte” y “quincena” como en tu Excel
    cut_month: { type: DataTypes.TINYINT, allowNull: false }, // 1-12
    fortnight: { type: DataTypes.ENUM("FIRST", "SECOND"), allowNull: false },

    // Mes de cobro (puede ser distinto)
    charge_month: { type: DataTypes.TINYINT, allowNull: true },

    invoice: { type: DataTypes.STRING(50), allowNull: true },
    client_name: { type: DataTypes.STRING(160), allowNull: false },
    plate: { type: DataTypes.STRING(20), allowNull: true },

    // unidades del asesor en ese corte para decidir tabla
    units_count: { type: DataTypes.INTEGER, allowNull: true },

    // tabla usada (1,2,3) para auditoría
    tier_used: { type: DataTypes.TINYINT, allowNull: false }, // 1|2|3

    commission_value: { type: DataTypes.DECIMAL(14, 2), allowNull: false },

    notes: { type: DataTypes.STRING(255), allowNull: true },

    created_by: { type: DataTypes.BIGINT, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "sales",
    timestamps: false,
    indexes: [
      { name: "idx_sales_brand", fields: ["brand_id"] },
      { name: "idx_sales_advisor", fields: ["advisor_id"] },
      { name: "idx_sales_vehicle", fields: ["vehicle_id"] },
      { name: "idx_sales_sale_date", fields: ["sale_date"] },
    ],
  }
);

export default Sale;
