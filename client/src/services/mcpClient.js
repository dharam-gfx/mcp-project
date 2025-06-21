import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const mcpClient = new Client({
    name: "example-client",
    version: "1.0.0",
});

let tools = [];

// Initialize MCP client and connect to server
async function initializeMcpClient() {
    await mcpClient.connect(new SSEClientTransport(new URL("http://localhost:3001/sse")));
    console.log("Connected to MCP server");

    tools = (await mcpClient.listTools()).tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
            type: tool.inputSchema.type,
            properties: tool.inputSchema.properties,
            required: tool.inputSchema.required
        }
    }));
}

// Handle chat messages
async function handleChat(message) {
    const chatHistory = [
        {
            role: "user",
            parts: [{ text: message, type: "text" }]
        }
    ];

    try {
        // Generate response using Gemini
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: chatHistory,
            config: {
                tools: [{
                    functionDeclarations: tools,
                }]
            }
        });
        console.log("chatHistory",chatHistory);
        

        const functionCall = response.candidates[0].content.parts[0].functionCall;
        const responseText = response.candidates[0].content.parts[0].text;

        // If there's a function call, execute it using MCP
        if (functionCall) {
            console.log("Calling tool:", functionCall.name);
            const toolResult = await mcpClient.callTool({
                name: functionCall.name,
                arguments: functionCall.args
            });
            return toolResult.content[0].text;
        }

        return responseText;
    } catch (error) {
        console.error('Error in chat handling:', error);
        return 'An error occurred while processing your request.';
    }
}

// Initialize connection
initializeMcpClient().catch(console.error);

// Export the chat handler for use in the frontend
export { handleChat };
