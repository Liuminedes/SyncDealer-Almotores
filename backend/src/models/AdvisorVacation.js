import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const AdvisorVacation = sequelize.define(
  "AdvisorVacation",
  {
    id:          { type: DataTypes.BIGINT,       autoIncrement: true, primaryKey: true },
    advisor_id:  { type: DataTypes.BIGINT,       allowNull: false },
    start_date:  { type: DataTypes.DATEONLY,     allowNull: false },
    end_date:    { type: DataTypes.DATEONLY,     allowNull: false },
    is_active:   { type: DataTypes.BOOLEAN,      allowNull: false, defaultValue: true },
    notes:       { type: DataTypes.STRING(255),  allowNull: true },
  },
  {
    tableName:  "advisor_vacations",
    timestamps: true,
    createdAt:  "created_at",
    updatedAt:  "updated_at",
  }
);

export default AdvisorVacation;