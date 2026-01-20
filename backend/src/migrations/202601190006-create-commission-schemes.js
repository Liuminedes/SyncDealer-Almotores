export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("commission_schemes", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },

    brand_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "brands", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    name: { type: Sequelize.STRING(120), allowNull: false },
    scheme_type: { type: Sequelize.ENUM("STANDARD", "KIA_PLAN"), allowNull: false, defaultValue: "STANDARD" },

    valid_from: { type: Sequelize.DATEONLY, allowNull: false },
    valid_to: { type: Sequelize.DATEONLY, allowNull: true },

    status: { type: Sequelize.ENUM("ACTIVE", "INACTIVE"), allowNull: false, defaultValue: "ACTIVE" },
    notes: { type: Sequelize.TEXT, allowNull: true },

    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("commission_schemes");
}
