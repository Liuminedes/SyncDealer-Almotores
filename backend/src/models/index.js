import { sequelize } from "../config/db.js";

import User from "./User.js";
import Role from "./Role.js";
import Brand from "./Brand.js";
import Branch from "./Branch.js";
import UserBrandAccess from "./UserBrandAccess.js";

// ✅ Sprint 5
import Vehicle from "./Vehicle.js";
import Sale from "./Sale.js";

// ✅ Sprint 6
import CommissionRun from "./CommissionRun.js";
import CommissionStatementItem from "./CommissionStatementItem.js";

// (Reglas existentes) — si luego las conectamos, las importamos.
// import CommissionScheme from "./CommissionScheme.js";
// import CommissionTier from "./CommissionTier.js";
// import CommissionVehicleRate from "./CommissionVehicleRate.js";

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

// Join table direct relations
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

// Quien creó el registro
Sale.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

// ============================
// ✅ Sprint 6: Commissions
// ============================

// CommissionRun: cabecera por corte/asesor
CommissionRun.belongsTo(Brand, { as: "brand", foreignKey: "brand_id" });
Brand.hasMany(CommissionRun, { as: "commissionRuns", foreignKey: "brand_id" });

CommissionRun.belongsTo(User, { as: "advisor", foreignKey: "advisor_id" });
User.hasMany(CommissionRun, { as: "commissionRuns", foreignKey: "advisor_id" });

CommissionRun.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

// Items del run
CommissionStatementItem.belongsTo(CommissionRun, { as: "run", foreignKey: "run_id" });
CommissionRun.hasMany(CommissionStatementItem, { as: "items", foreignKey: "run_id" });

// Link clave: item -> sale (por id de venta)
CommissionStatementItem.belongsTo(Sale, { as: "sale", foreignKey: "sale_id" });
Sale.hasMany(CommissionStatementItem, { as: "commissionItems", foreignKey: "sale_id" });

// Para acceso rápido
CommissionStatementItem.belongsTo(Vehicle, { as: "vehicle", foreignKey: "vehicle_id" });
Vehicle.hasMany(CommissionStatementItem, { as: "commissionItems", foreignKey: "vehicle_id" });

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

  // Sprint 6
  CommissionRun,
  CommissionStatementItem,
};
