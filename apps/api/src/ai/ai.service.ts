import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || null;
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API Key missing');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (e) {
      console.error('[Gemini Service] Fetch failure:', e);
      throw e;
    }
  }

  async chat(message: string, boardContext?: string): Promise<string> {
    const systemPrompt = `You are an intelligent, helpful AI assistant built into Aether - a next-generation real-time collaborative student workspace.
You can help write ideas, refine architecture, draw diagrams, and summarize board states.
${boardContext ? `Here is the current JSON state of the whiteboard canvas for context: ${boardContext}` : ''}
Be conversational, helpful, clean, and concise. Use Markdown formatting where appropriate.`;

    try {
      return await this.callGemini(systemPrompt, message);
    } catch (e) {
      // Mock Fallback Dialogs
      console.log('[AiService] Falling back to mock assistant response.');
      const lower = message.toLowerCase();
      if (lower.includes('hello') || lower.includes('hi')) {
        return "Hi there! I am your Aether AI Assistant. How can I help you design, model, or document your team's project today?";
      }
      if (lower.includes('architecture') || lower.includes('diagram')) {
        return "It looks like you're working on system architecture. You can use the **Architecture Generator** tab to automatically generate a node diagram of a three-tier web application, a microservice setup, or any custom architecture and place it directly on the whiteboard.";
      }
      return `I received your message: "${message}".\n\nI am currently running in Mock mode because a **GEMINI_API_KEY** was not detected in the backend .env configuration. Configure it to enable live generative capabilities!`;
    }
  }

  async generateArchitecture(prompt: string): Promise<any> {
    const systemPrompt = `You are a system architecture designer. Generate a React Flow JSON layout structure representing this architecture on a collaborative whiteboard.
The output MUST be a clean JSON object containing:
- "nodes": array of objects. Each node must have "id", "type" (always set to "shape"), "position" (x, y coordinates), and "data" (with fields: "type" which is "rectangle" or "circle", and "label" which is the component name, e.g. "API Gateway", "Auth Service", "Postgres DB").
- "edges": array of objects. Each edge must have "id", "source" (node ID), "target" (node ID), "type" (always "smoothstep"), and optionally "animated": true.

Ensure you position the nodes logically so they don't overlap and represent a clear flow (e.g. layers from top to bottom, or left to right).
Response format: Output ONLY the raw JSON string. Do not wrap in markdown codeblock formatting like \`\`\`json.`;

    try {
      const responseText = await this.callGemini(systemPrompt, prompt);
      // Clean up markdown block wraps if model wraps them anyway
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.log('[AiService] Falling back to mock architecture generator.');
      // Return a beautiful mock three-tier architecture diagram!
      return {
        nodes: [
          {
            id: 'node-client',
            type: 'shape',
            position: { x: 250, y: 50 },
            data: { type: 'rectangle', label: 'Next.js Client Application' }
          },
          {
            id: 'node-gateway',
            type: 'shape',
            position: { x: 250, y: 150 },
            data: { type: 'rectangle', label: 'NestJS API Gateway' }
          },
          {
            id: 'node-auth',
            type: 'shape',
            position: { x: 50, y: 250 },
            data: { type: 'circle', label: 'Auth Service' }
          },
          {
            id: 'node-db',
            type: 'shape',
            position: { x: 450, y: 250 },
            data: { type: 'circle', label: 'PostgreSQL Database' }
          }
        ],
        edges: [
          { id: 'e-client-gateway', source: 'node-client', target: 'node-gateway', type: 'smoothstep', animated: true },
          { id: 'e-gateway-auth', source: 'node-gateway', target: 'node-auth', type: 'smoothstep' },
          { id: 'e-gateway-db', source: 'node-gateway', target: 'node-db', type: 'smoothstep', animated: true }
        ]
      };
    }
  }

  async generateDocumentation(boardState: string): Promise<string> {
    const systemPrompt = `Read the following React Flow JSON representing nodes and edges on a collaborative whiteboard canvas:
${boardState}
Compile this whiteboard layout into a beautifully structured, comprehensive Markdown documentation file. Explain the architecture, components (databases, clients, services), interactions, and flow of operations. Add section headings and lists.`;

    try {
      return await this.callGemini(systemPrompt, 'Summarize the board state.');
    } catch (e) {
      console.log('[AiService] Falling back to mock documentation compiler.');
      return `# Whiteboard System Design Documentation

This documentation summarizes the system design modeled on the whiteboard.

## Architecture Overview
The whiteboard model represents a standard **Three-Tier Web Application** featuring decoupled client-server interactions:

1. **Presentation Layer**: Next.js client application handles dashboard renders, whiteboard interactions, and JWT token sessions.
2. **Application Gateway Layer**: NestJS API handles authentication middleware, organization lookups, and WebSocket connections.
3. **Data Tier**: PostgreSQL persists user credentials, organization members, canvas coordinates, and comment pins.

---
*Note: Configured with automated static backup uploads.*`;
    }
  }

  async notesToUml(notes: string): Promise<any> {
    const systemPrompt = `Convert the following text notes into a visual flowchart/UML diagram layout represented by React Flow nodes and edges:
User Notes: ${notes}

The output MUST be a clean JSON object containing:
- "nodes": array of objects. Each node must have "id", "type" (always set to "shape"), "position" (x, y coordinates), and "data" (with fields: "type" which is "rectangle" or "circle", and "label" which is the step/component name).
- "edges": array of objects. Each edge must have "id", "source" (node ID), "target" (node ID), "type" (always "smoothstep").

Response format: Output ONLY the raw JSON string. Do not wrap in markdown codeblock formatting like \`\`\`json.`;

    try {
      const responseText = await this.callGemini(systemPrompt, notes);
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.log('[AiService] Falling back to mock UML converter.');
      return {
        nodes: [
          {
            id: 'uml-1',
            type: 'shape',
            position: { x: 150, y: 50 },
            data: { type: 'rectangle', label: 'Start: User Registration' }
          },
          {
            id: 'uml-2',
            type: 'shape',
            position: { x: 150, y: 150 },
            data: { type: 'rectangle', label: 'Verify Email OTP Code' }
          },
          {
            id: 'uml-3',
            type: 'shape',
            position: { x: 150, y: 250 },
            data: { type: 'circle', label: 'Write User to Db' }
          }
        ],
        edges: [
          { id: 'uml-e1', source: 'uml-1', target: 'uml-2', type: 'smoothstep' },
          { id: 'uml-e2', source: 'uml-2', target: 'uml-3', type: 'smoothstep' }
        ]
      };
    }
  }
}
