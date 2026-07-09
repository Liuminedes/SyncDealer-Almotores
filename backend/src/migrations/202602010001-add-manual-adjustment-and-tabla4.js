// migrations/202602010001-add-manual-adjustment-and-tabla4.js
//
// Qué hace esta migración:
//   1. Agrega campos de ajuste manual a commission_runs
//   2. Agrega campo base_commission (comisión pura sin ajuste, para trazabilidad)
//   3. Actualiza rangos de TABLA_1/2/3 de KIA a los rangos definitivos
//   4. Inserta TABLA_4 para KIA (9+ unidades)

export async function up(queryInterface, Sequelize) {
  // ── 1) Nuevas columnas en commission_runs ──────────────────────────────────
  await queryInterface.addColumn("commission_runs", "base_commission", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    after: "total_commission",
    comment: "Comisión pura calculada por rangos, sin ajuste manual",
  });

  await queryInterface.addColumn("commission_runs", "manual_adjustment", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: null,
    after: "base_commission",
    comment: "Monto del ajuste manual aplicado por BRAND_OP",
  });

  await queryInterface.addColumn("commission_runs", "manual_adjustment_type", {
    type: Sequelize.ENUM("ADD", "SUBTRACT"),
    allowNull: true,
    defaultValue: null,
    after: "manual_adjustment",
  });

  await queryInterface.addColumn("commission_runs", "manual_adjustment_note", {
    type: Sequelize.STRING(500),
    allowNull: true,
    defaultValue: null,
    after: "manual_adjustment_type",
    comment: "Concepto obligatorio del ajuste (ej: Cobro de transporte)",
  });

  await queryInterface.addColumn("commission_runs", "manual_adjustment_by", {
    type: Sequelize.BIGINT,
    allowNull: true,
    defaultValue: null,
    after: "manual_adjustment_note",
    comment: "ID del usuario que aplicó el ajuste",
  });

  await queryInterface.addColumn("commission_runs", "manual_adjustment_at", {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: null,
    after: "manual_adjustment_by",
    comment: "Timestamp de cuando se aplicó el ajuste",
  });

  // ── 2) Actualizar rangos existentes de KIA ─────────────────────────────────
  // Rangos definitivos confirmados:
  //   TABLA_1 = 1 a 5 vehículos
  //   TABLA_2 = 6 vehículos (exacto)
  //   TABLA_3 = 7 a 8 vehículos
  //   TABLA_4 = 9+ vehículos (nuevo)
  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 1, ct.max_units = 5, ct.priority = 1
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_1'
  `);

  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 6, ct.max_units = 6, ct.priority = 2
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_2'
  `);

  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 7, ct.max_units = 8, ct.priority = 3
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_3'
  `);

  // ── 3) Insertar TABLA_4 para KIA ──────────────────────────────────────────
  await queryInterface.sequelize.query(`
    INSERT INTO commission_tiers (scheme_id, tier_name, min_units, max_units, priority, created_at, updated_at)
    SELECT cs.id, 'TABLA_4', 9, NULL, 4, NOW(), NOW()
    FROM commission_schemes cs
    JOIN brands b ON b.id = cs.brand_id
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1 FROM commission_tiers ct2
      WHERE ct2.scheme_id = cs.id AND ct2.tier_name = 'TABLA_4'
    )
    LIMIT 1
  `);
}

export async function down(queryInterface) {
  // Revertir columnas
  await queryInterface.removeColumn("commission_runs", "manual_adjustment_at");
  await queryInterface.removeColumn("commission_runs", "manual_adjustment_by");
  await queryInterface.removeColumn("commission_runs", "manual_adjustment_note");
  await queryInterface.removeColumn("commission_runs", "manual_adjustment_type");
  await queryInterface.removeColumn("commission_runs", "manual_adjustment");
  await queryInterface.removeColumn("commission_runs", "base_commission");

  // Revertir TABLA_4 (solo borra si no tiene rates asociadas)
  await queryInterface.sequelize.query(`
    DELETE ct FROM commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    WHERE b.code = 'KIA' AND ct.tier_name = 'TABLA_4'
    AND NOT EXISTS (SELECT 1 FROM commission_vehicle_rates cvr WHERE cvr.tier_id = ct.id LIMIT 1)
  `);

  // Revertir rangos a los valores originales del seeder
  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 1, ct.max_units = 4
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_1'
  `);
  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 5, ct.max_units = 6
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_2'
  `);
  await queryInterface.sequelize.query(`
    UPDATE commission_tiers ct
    JOIN commission_schemes cs ON cs.id = ct.scheme_id
    JOIN brands b ON b.id = cs.brand_id
    SET ct.min_units = 7, ct.max_units = NULL
    WHERE b.code = 'KIA' AND cs.status = 'ACTIVE' AND ct.tier_name = 'TABLA_3'
  `);
}
