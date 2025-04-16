import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import axios, { isAxiosError } from "axios"; // Add axios for API calls
import { z, type ZodRawShape } from "zod"; // Add zod for schema validation

const mcpServer = new McpServer(
  {
    name: "ExampleMCPServer",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

mcpServer.resource(
  "document",
  new ResourceTemplate("document://{name}", {
    list: async () => {
      return {
        resources: [
          {
            name: "document-getting-started",
            uri: "document://getting-started",
          },
        ],
      };
    },
  }),
  async (uri, variables) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: "Getting Started",
          mimeType: "text/plain",
        },
      ],
    };
  }
);

// Define the zod schema for input validation
const weatherInputSchema: ZodRawShape = {
  city: z.string().min(1, "City name is required"),
  country: z.string().optional(),
};

// Update the weather-tool
mcpServer.tool(
  "weather-tool",
  "Get weather information",
  weatherInputSchema,
  async (input) => {
    try {
      const apiKey = process.env.OPEN_WEATHER_API_KEY;
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            q: `${input.city}${input.country ? `,${input.country}` : ""}`,
            appid: apiKey,
            units: "metric",
          },
        }
      );

      const weatherData = response.data;

      // Return the weather information
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              temperature: weatherData.main.temp,
              description: weatherData.weather[0].description,
              city: weatherData.name,
              country: weatherData.sys.country,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching weather data: ${
              isAxiosError(error) ? error.message : "Failed to fetch data"
            }`,
          },
        ],
      };
    }
  }
);

export { mcpServer };
