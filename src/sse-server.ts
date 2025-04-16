import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send();
    return;
  }
  const token = authHeader.split(" ")[1];
  if (token !== process.env.MCP_SERVER_TOKEN) {
    res.status(403).send();
    return;
  }
  next();
};

export function createSSEServer(mcpServer: McpServer) {
  const app = express();

  const transportMap = new Map<string, SSEServerTransport>();
  app.use(authMiddleware);

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transportMap.set(transport.sessionId, transport);
    await mcpServer.connect(transport);
  });

  app.post("/messages", (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      console.error("Message received without sessionId");
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const transport = transportMap.get(sessionId);

    if (transport) {
      transport.handlePostMessage(req, res);
    }
  });

  return app;
}
