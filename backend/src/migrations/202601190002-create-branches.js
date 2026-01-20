export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("branches", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(60), allowNull: false },
    code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
    is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("branches");
}
