import app from "./app.js";
import { connectDb } from "./lib/db.js";

const port = Number(process.env.PORT || 4000);

connectDb()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`API server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect MongoDB", error);
    process.exit(1);
  });
