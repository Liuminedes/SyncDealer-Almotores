import { createApp } from "./app.js";
import { ENV } from "./config/env.js";
import { sequelize } from "./config/db.js";

async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected successfully");

    const app = createApp();
    app.listen(ENV.PORT, () => {
      console.log(`🚀 API running on http://localhost:${ENV.PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
