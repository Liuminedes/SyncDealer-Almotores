export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("commission_tiers", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },

    scheme_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "commission_schemes", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    tier_name: { type: Sequelize.ENUM("TABLA_1", "TABLA_2", "TABLA_3"), allowNull: false },
    min_units: { type: Sequelize.INTEGER, allowNull: false },
    max_units: { type: Sequelize.INTEGER, allowNull: true },
    priority: { type: Sequelize.INTEGER, allowNull: false },

    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("commission_tiers");
}
