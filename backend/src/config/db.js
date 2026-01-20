import { Sequelize } from "sequelize";
import { ENV } from "./env.js";

export const sequelize = new Sequelize(
  ENV.DB_NAME,
  ENV.DB_USER,
  ENV.DB_PASSWORD,
  {
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    dialect: "mysql",
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
    timezone: "-05:00",
  }
);

// 👇 Config compatible con sequelize-cli (cuando lo usemos con --config)
const cliConfig = {
  username: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_NAME,
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  dialect: "mysql",
};

export default {
  development: cliConfig,
  test: cliConfig,
  production: cliConfig,
};
