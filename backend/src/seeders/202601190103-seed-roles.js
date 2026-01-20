export async function up(queryInterface) {
  await queryInterface.bulkInsert("roles", [
    { name: "ADMIN", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "ASSISTANT_SALES", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "BRAND_MANAGER", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "ADVISOR", is_active: true, created_at: new Date(), updated_at: new Date() },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete("roles", null, {});
}
