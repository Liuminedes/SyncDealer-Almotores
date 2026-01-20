export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("user_brand_access", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },

    user_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    brand_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "brands", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    can_view: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    can_generate: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });

  await queryInterface.addConstraint("user_brand_access", {
    fields: ["user_id", "brand_id"],
    type: "unique",
    name: "uniq_user_brand_access_user_brand",
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("user_brand_access");
}
