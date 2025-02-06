import { storage } from "../server/storage";

async function main() {
  try {
    console.log("Initializing database with sample data...");
    await storage.initializeData();
    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

main();
