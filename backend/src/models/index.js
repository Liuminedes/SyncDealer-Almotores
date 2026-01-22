import { sequelize } from "../config/db.js";

import User from "./User.js";
import Role from "./Role.js";
import Brand from "./Brand.js";
import Branch from "./Branch.js";
import UserBrandAccess from "./UserBrandAccess.js";

// 🆕 Sprint 5
import Vehicle from "./Vehicle.js";
import Sale from "./Sale.js";

// ===== Associations =====

// Role <-> User
User.belongsTo(Role, { as: "role", foreignKey: "role_id" });
Role.hasMany(User, { as: "users", foreignKey: "role_id" });

// Brand <-> Branch
Branch.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Branch, { as: "branches", foreignKey: "brand_id" });

// User <-> Brand (many-to-many) via UserBrandAccess
User.belongsToMany(Brand, {
  through: UserBrandAccess,
  foreignKey: "user_id",
  otherKey: "brand_id",
});
Brand.belongsToMany(User, {
  through: UserBrandAccess,
  foreignKey: "brand_id",
  otherKey: "user_id",
});

// Join table direct relations (útil para includes / bulk ops)
UserBrandAccess.belongsTo(User, { as: "user", foreignKey: "user_id" });
UserBrandAccess.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });

// ============================
// ✅ Sprint 5: Vehicles & Sales
// ============================

// Brand <-> Vehicle
Vehicle.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Vehicle, { as: "vehicles", foreignKey: "brand_id" });

// Sales relations
Sale.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Sale, { as: "sales", foreignKey: "brand_id" });

Sale.belongsTo(User, { as: "advisor", foreignKey: "advisor_id" });
User.hasMany(Sale, { as: "sales", foreignKey: "advisor_id" });

Sale.belongsTo(Vehicle, { as: "vehicle", foreignKey: "vehicle_id" });
Vehicle.hasMany(Sale, { as: "sales", foreignKey: "vehicle_id" });

// (Opcional pero útil) quien creó el registro
Sale.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

export {
  sequelize,
  User,
  Role,
  Brand,
  Branch,
  UserBrandAccess,
  // Sprint 5
  Vehicle,
  Sale,
};
