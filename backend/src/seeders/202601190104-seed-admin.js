import bcrypt from "bcryptjs";

export async function up(queryInterface, Sequelize) {
  const [roles] = await queryInterface.sequelize.query(`SELECT id, name FROM roles;`);
  const [brands] = await queryInterface.sequelize.query(`SELECT id, code FROM brands;`);

  const adminRole = roles.find(r => r.name === "ADMIN");
  if (!adminRole) throw new Error("ADMIN role not found");

  const passwordHash = await bcrypt.hash("Admin123*", 10);

  await queryInterface.bulkInsert("users", [
    {
      full_name: "Mauricio Rodriguez Lemos",
      document_number: "1005897939",
      email: "auxinformatica2@almotores.com",
      phone: null,
      password_hash: passwordHash,
      role_id: adminRole.id,
      branch_id: null,
      hire_date: null,
      is_active: true,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  const [admins] = await queryInterface.sequelize.query(`SELECT id FROM users WHERE email='auxinformatica2@almotores.com' LIMIT 1;`);
  const admin = admins[0];

  const accessRows = brands.map(b => ({
    user_id: admin.id,
    brand_id: b.id,
    can_view: true,
    can_generate: true,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  await queryInterface.bulkInsert("user_brand_access", accessRows);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete("user_brand_access", null, {});
  await queryInterface.bulkDelete("users", { email: "auxinformatica2@almotores.com" }, {});
}
