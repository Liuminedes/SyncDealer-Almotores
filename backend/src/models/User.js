import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    full_name: { type: DataTypes.STRING(160), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },

    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default User;
