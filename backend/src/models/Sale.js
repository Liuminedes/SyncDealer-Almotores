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

    cut_month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    fortnight: { type: DataTypes.ENUM("FIRST", "SECOND"), allowNull: false },
    charge_month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },

    invoice: { type: DataTypes.STRING(50) },
    client_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plate: { type: DataTypes.STRING(20) },
    notes: { type: DataTypes.STRING(255) },

    created_by: { type: DataTypes.BIGINT },
  },
  {
    tableName: "sales",
    timestamps: true,
    underscored: true,
  }
);

export default Sale;
