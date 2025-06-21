import express from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { addTwoNumbersTool } from "../tools/addTwoNumbers.js";
import { agentInfoTool } from "../tools/agentInfo.js";
import { carInventoryTool } from "../tools/carInventory.js";

const router = express.Router();
const server = new McpServer({
    name: "example-server",
    version: "1.0.0"
});

// Register tools
server.tool(...addTwoNumbersTool);
server.tool(...agentInfoTool);
server.tool(...carInventoryTool);

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports = {};

router.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[ transport.sessionId ] = transport;
    res.on("close", () => {
        delete transports[ transport.sessionId ];
    });
    await server.connect(transport);
});

router.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[ sessionId ];
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send('No transport found for sessionId');
    }
});

export { router as mcpRoutes };
