import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommissionRun = sequelize.define(
  "CommissionRun",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id:   { type: DataTypes.BIGINT, allowNull: false },
    advisor_id: { type: DataTypes.BIGINT, allowNull: false },

    cut_year:  { type: DataTypes.SMALLINT,         allowNull: false },
    cut_month: { type: DataTypes.TINYINT.UNSIGNED,  allowNull: false },
    fortnight: { type: DataTypes.ENUM("FIRST", "SECOND"), allowNull: false },

    scheme_id: { type: DataTypes.BIGINT, allowNull: true },

    units_total:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },

    // base_commission = comisión pura por rangos (nunca se modifica post-cálculo)
    base_commission:  { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    // total_commission = base_commission ± manual_adjustment (lo que ve el asesor)
    total_commission: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

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

    // ── Ajuste manual (BRAND_OP, solo en estado CALCULATED) ─────────────────
    // null = sin ajuste aplicado
    manual_adjustment:      { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: null },
    manual_adjustment_type: { type: DataTypes.ENUM("ADD", "SUBTRACT"), allowNull: true, defaultValue: null },
    manual_adjustment_note: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
    manual_adjustment_by:   { type: DataTypes.BIGINT, allowNull: true, defaultValue: null },
    manual_adjustment_at:   { type: DataTypes.DATE,   allowNull: true, defaultValue: null },

    // ── Notas y rechazo ─────────────────────────────────────────────────────
    rejection_note: { type: DataTypes.STRING(500), allowNull: true },
    notes:          { type: DataTypes.STRING(255), allowNull: true },
    created_by:     { type: DataTypes.BIGINT,      allowNull: true },

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
