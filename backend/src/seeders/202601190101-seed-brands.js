export async function up(queryInterface) {
  await queryInterface.bulkInsert("brands", [
    { name: "KIA", code: "KIA", is_active: 1 },
    { name: "Volkswagen", code: "VW", is_active: 1 },
    { name: "Renault", code: "REN", is_active: 1 },
    { name: "JAC/Jetour", code: "JAC", is_active: 1 },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete("brands", null, {});
}
