import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Role = sequelize.define(
  "Role",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  },
  {
    tableName: "roles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Role;
