import { sequelize } from "../config/db.js";

import User from "./User.js";
import Role from "./Role.js";
import Brand from "./Brand.js";
import Branch from "./Branch.js";
import UserBrandAccess from "./UserBrandAccess.js";

import Vehicle from "./Vehicle.js";
import Sale from "./Sale.js";

import CommissionRun from "./CommissionRun.js";
import CommissionStatementItem from "./CommissionStatementItem.js";

import CommissionScheme from "./CommissionScheme.js";
import CommissionTier from "./CommissionTier.js";

import SchemeRule from "./SchemeRule.js";
import SchemeBonus from "./SchemeBonus.js";

// ===== Associations =====

User.belongsTo(Role, { as: "role", foreignKey: "role_id" });
Role.hasMany(User, { as: "users", foreignKey: "role_id" });

Branch.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Branch, { as: "branches", foreignKey: "brand_id" });

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

UserBrandAccess.belongsTo(User, { as: "user", foreignKey: "user_id" });
UserBrandAccess.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });

Vehicle.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Vehicle, { as: "vehicles", foreignKey: "brand_id" });

Sale.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(Sale, { as: "sales", foreignKey: "brand_id" });

Sale.belongsTo(User, { as: "advisor", foreignKey: "advisor_id" });
User.hasMany(Sale, { as: "sales", foreignKey: "advisor_id" });

Sale.belongsTo(Vehicle, { as: "vehicle", foreignKey: "vehicle_id" });
Vehicle.hasMany(Sale, { as: "sales", foreignKey: "vehicle_id" });

Sale.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

CommissionRun.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(CommissionRun, { as: "commissionRuns", foreignKey: "brand_id" });

CommissionRun.belongsTo(User, { as: "advisor", foreignKey: "advisor_id" });
User.hasMany(CommissionRun, { as: "commissionRuns", foreignKey: "advisor_id" });

CommissionRun.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

CommissionStatementItem.belongsTo(CommissionRun, { as: "run", foreignKey: "run_id" });
CommissionRun.hasMany(CommissionStatementItem, { as: "items", foreignKey: "run_id" });

CommissionStatementItem.belongsTo(Sale, { as: "sale", foreignKey: "sale_id" });
Sale.hasMany(CommissionStatementItem, { as: "commissionItems", foreignKey: "sale_id" });

CommissionStatementItem.belongsTo(Vehicle, { as: "vehicle", foreignKey: "vehicle_id" });
Vehicle.hasMany(CommissionStatementItem, { as: "commissionItems", foreignKey: "vehicle_id" });

CommissionScheme.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(CommissionScheme, { as: "commissionSchemes", foreignKey: "brand_id" });

CommissionTier.belongsTo(CommissionScheme, { as: "scheme", foreignKey: "scheme_id" });
CommissionScheme.hasMany(CommissionTier, { as: "tiers", foreignKey: "scheme_id" });

SchemeRule.belongsTo(CommissionScheme, { as: "scheme", foreignKey: "scheme_id" });
CommissionScheme.hasMany(SchemeRule, { as: "rules", foreignKey: "scheme_id" });

SchemeBonus.belongsTo(CommissionScheme, { as: "scheme", foreignKey: "scheme_id" });
CommissionScheme.hasMany(SchemeBonus, { as: "bonuses", foreignKey: "scheme_id" });

export {
  sequelize,
  User,
  Role,
  Brand,
  Branch,
  UserBrandAccess,

  Vehicle,
  Sale,

  CommissionRun,
  CommissionStatementItem,

  CommissionScheme,
  CommissionTier,

  SchemeRule,
  SchemeBonus,
};
