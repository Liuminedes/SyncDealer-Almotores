export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("commission_vehicle_rates", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },

    scheme_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "commission_schemes", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    vehicle_code: { type: Sequelize.STRING(60), allowNull: false },
    model: { type: Sequelize.STRING(60), allowNull: false },
    version: { type: Sequelize.STRING(60), allowNull: false },

    tier_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "commission_tiers", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },

    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });

  await queryInterface.addConstraint("commission_vehicle_rates", {
    fields: ["scheme_id", "vehicle_code", "tier_id"],
    type: "unique",
    name: "uniq_vehicle_rate_scheme_vehicle_tier",
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("commission_vehicle_rates");
}
