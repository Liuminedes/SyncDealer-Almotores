export async function up(queryInterface) {
  const [brands] = await queryInterface.sequelize.query(`SELECT id FROM brands WHERE code='KIA' LIMIT 1;`);
  const kia = brands[0];

  await queryInterface.bulkInsert("commission_schemes", [
    {
      brand_id: kia.id,
      name: "KIA Standard Scheme",
      scheme_type: "STANDARD",
      valid_from: "2026-01-01",
      valid_to: null,
      status: "ACTIVE",
      notes: "Esquema estándar KIA (tabla por matrículas)",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  const [schemes] = await queryInterface.sequelize.query(
    `SELECT id FROM commission_schemes WHERE brand_id=${kia.id} AND status='ACTIVE' ORDER BY id DESC LIMIT 1;`
  );
  const scheme = schemes[0];

  await queryInterface.bulkInsert("commission_tiers", [
    { scheme_id: scheme.id, tier_name: "TABLA_1", min_units: 1, max_units: 4, priority: 1, created_at: new Date(), updated_at: new Date() },
    { scheme_id: scheme.id, tier_name: "TABLA_2", min_units: 5, max_units: 6, priority: 2, created_at: new Date(), updated_at: new Date() },
    { scheme_id: scheme.id, tier_name: "TABLA_3", min_units: 7, max_units: null, priority: 3, created_at: new Date(), updated_at: new Date() },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete("commission_tiers", null, {});
  await queryInterface.bulkDelete("commission_schemes", { name: "KIA Standard Scheme" }, {});
}
