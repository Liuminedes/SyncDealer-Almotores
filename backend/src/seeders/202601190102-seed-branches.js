export async function up(queryInterface) {
  await queryInterface.bulkInsert("branches", [
    { name: "Norte", code: "NORTE", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "39", code: "39", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Pasoancho", code: "PASOANCHO", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Pance", code: "PANCE", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Motorwagen", code: "MOTORWAGEN", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Centenario", code: "CENTENARIO", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Ciudad Jardin", code: "CIUDAD_JARDIN", is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: "Palmira", code: "PALMIRA", is_active: true, created_at: new Date(), updated_at: new Date() },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete("branches", null, {});
}
