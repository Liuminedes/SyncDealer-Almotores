import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id:            { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    role_id:       { type: DataTypes.BIGINT, allowNull: false },
    branch_id:     { type: DataTypes.BIGINT, allowNull: true },

    full_name:       { type: DataTypes.STRING(120), allowNull: false },
    email:           { type: DataTypes.STRING(120), allowNull: false, unique: true },
    document_number: { type: DataTypes.STRING(30),  allowNull: true },
    phone:           { type: DataTypes.STRING(30),  allowNull: true },
    password_hash:   { type: DataTypes.STRING(255), allowNull: false },
    hire_date:       { type: DataTypes.DATEONLY,    allowNull: true },

    is_active:     { type: DataTypes.BOOLEAN,  allowNull: false, defaultValue: true },
    last_login_at: { type: DataTypes.DATE,     allowNull: true },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default User;