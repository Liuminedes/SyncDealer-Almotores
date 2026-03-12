import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionRun = sequelize.define(
  "CommissionRun",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id:   { type: DataTypes.BIGINT, allowNull: false },
    advisor_id: { type: DataTypes.BIGINT, allowNull: false },

    cut_year:  { type: DataTypes.SMALLINT,        allowNull: false },
    cut_month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    fortnight: { type: DataTypes.ENUM("FIRST", "SECOND"), allowNull: false },

    scheme_id: { type: DataTypes.BIGINT, allowNull: true },

    units_total:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    total_commission: { type: DataTypes.DECIMAL(14, 2),   allowNull: false, defaultValue: 0 },

    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "CALCULATED",
        "ADVISOR_APPROVED",
        "ADVISOR_REJECTED",
        "ASST_VALIDATED",
        "SENT_TO_HR"
      ),
      allowNull: false,
      defaultValue: "DRAFT",
    },

    // Nota de rechazo del asesor (se llena cuando ADVISOR_REJECTED)
    rejection_note: { type: DataTypes.STRING(500), allowNull: true },

    notes:      { type: DataTypes.STRING(255), allowNull: true },
    created_by: { type: DataTypes.BIGINT,      allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "commission_runs",
    timestamps: false,
    indexes: [
      { name: "idx_run_brand",   fields: ["brand_id"] },
      { name: "idx_run_advisor", fields: ["advisor_id"] },
      { name: "idx_run_cut",     fields: ["cut_year", "cut_month", "fortnight"] },
      { name: "idx_run_scheme",  fields: ["scheme_id"] },
    ],
  }
);

export default CommissionRun;