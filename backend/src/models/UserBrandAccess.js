import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const UserBrandAccess = sequelize.define(
  "UserBrandAccess",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    brand_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    can_view: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    can_generate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "user_brand_access",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["user_id", "brand_id"] }],
  }
);

export default UserBrandAccess;
