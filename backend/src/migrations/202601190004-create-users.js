export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("users", {
    id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
    full_name: { type: Sequelize.STRING(120), allowNull: false },
    document_number: { type: Sequelize.STRING(30), allowNull: false },
    email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
    phone: { type: Sequelize.STRING(30), allowNull: true },
    password_hash: { type: Sequelize.STRING(255), allowNull: false },

    role_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: "roles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    branch_id: {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "branches", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    hire_date: { type: Sequelize.DATEONLY, allowNull: true },
    is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    last_login_at: { type: Sequelize.DATE, allowNull: true },

    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("users");
}
