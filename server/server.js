import express from "express";
import cors from "cors";
import { mcpRoutes } from "./src/routes/mcpRoutes.js";
import { inventoryRoutes } from "./src/routes/inventoryRoutes.js";

const app = express();
app.use(cors(
    {
        origin: "*", // Adjust this to your client URL}
    }
));

// Use MCP routes
app.use('/', mcpRoutes);

// Use inventory API routes
app.use('/api/inventory', inventoryRoutes);

app.listen(3001, () => {
    console.log("Server is running on http://localhost:3001");
});