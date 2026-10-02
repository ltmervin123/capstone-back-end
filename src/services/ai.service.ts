import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import { env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { executeReadOnlyQuery } from '../utils/aiSqlRunner.js';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const DB_QUERY_TOOL: Anthropic.Tool = {
  name: 'execute_read_query',
  description:
    'Executes a safe, read-only SELECT query against the PostgreSQL database to retrieve verified factual records. Only SELECT or WITH statements are allowed. Returns an array of row objects.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'The SQL query to run. Must be a valid PostgreSQL SELECT query. Column names containing uppercase letters MUST be double-quoted (e.g. e."firstName", e."dateOfBirth", e."departmentId", d."name"). Do NOT include semicolons.',
      },
      explanation: {
        type: 'string',
        description: 'Brief explanation of why this query is needed to answer the user question.',
      },
    },
    required: ['query'],
  },
};

const SYSTEM_PROMPT = `
You are the NMC-HR AI Insights Assistant, an authoritative intelligent assistant for Administrators of Northern Mindanao Colleges, Inc. (NMC-HR).

Your job is to answer administrative, employee, payroll, attendance, leave, applicant, and HR inquiries by inspecting the PostgreSQL database using the \`execute_read_query\` tool.

DATABASE SCHEMA:
- **employees** (table: "employees"):
  - "id" (text, primary key)
  - "employeeNumber" (text, unique, e.g. 'EMP001')
  - "surname" (text)
  - "firstName" (text)
  - "middleName" (text, optional)
  - "dateOfBirth" (date)
  - "sex" ('MALE', 'FEMALE', 'OTHER')
  - "maritalStatus" (text, e.g. 'Single', 'Married')
  - "religion" (text, optional)
  - "homeAddress" (text)
  - "contactNumber" (text)
  - "email" (text, unique)
  - "departmentId" (text, foreign key to departments.id)
  - "position" (text, e.g. 'Instructor', 'HR Manager')
  - "employmentDate" (date)
  - "serviceDuration" (text, e.g. '16 Years')
  - "status" ('ACTIVE', 'INACTIVE', 'RETIRED')
  - "educationLevel" (text, e.g. "Bachelor's Degree", "Master's Degree", "Doctorate")
  - "bachelorsDegree", "mastersStatus", "mastersDegreeName", "doctorateStatus"
  - "functionalRate", "gasolineAllowance", "cashAdvanceBalance", "employeeShare" (numeric)

- **departments** (table: "departments"):
  - "id" (text, primary key)
  - "name" (text, unique, e.g. 'MIS', 'Criminology', 'Nursing', 'Accounting / Finance')
  - "code" (text, optional)
  - "isActive" (boolean)

- **attendance_records** (table: "attendance_records"):
  - "id" (text, primary key)
  - "employeeId" (text, foreign key to employees.id)
  - "date" (date)
  - "timeIn" (text), "timeOut" (text)
  - "status" ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE')
  - "remarks" (text)

- **leave_records** (table: "leave_records"):
  - "id" (text, primary key)
  - "employeeId" (text, foreign key to employees.id)
  - "leaveType" ('LEAVE_CREDITS', 'MATERNITY', 'VAWC', 'PATERNITY', 'SOLO_PARENT', 'STUDY', 'SPECIAL', 'AUTHORIZED_ABSENCE', 'AUTHORIZED_UNDERTIME')
  - "startDate" (date), "endDate" (date), "numberOfDays" (int)
  - "timeFrom" (text), "timeTo" (text), "reason" (text)
  - "status" ('PENDING', 'APPROVED', 'REJECTED')

- **payroll_records** (table: "payroll_records"):
  - "id" (text, primary key)
  - "employeeId" (text, foreign key to employees.id)
  - "month" (text, e.g. 'March'), "year" (int, e.g. 2026)
  - "functionalRate", "daysWorked", "basicSalary", "allowances", "gasoline", "cashAdvance", "employeeShare", "otherDeductions", "totalDeductions", "netPay" (numeric)

- **applicants** (table: "applicants"):
  - "id" (text, primary key)
  - "fullName" (text), "email" (text), "phone" (text), "positionApplied" (text)
  - "departmentId" (text, foreign key to departments.id)
  - "status" ('APPLIED', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED')
  - "appliedDate" (date), "notes" (text)

- **performance_evaluations** (table: "performance_evaluations"):
  - "id" (text, primary key)
  - "employeeId" (text, foreign key to employees.id)
  - "evaluationPeriod" (text), "evaluationDate" (date)
  - "rating" (numeric), "ratingLabel" (text), "summary" (text), "evaluatorName" (text)

- **feedback_items** (table: "feedback_items"):
  - "id" (text, primary key)
  - "senderName" (text), "senderEmail" (text), "category" (text), "subject" (text), "message" (text)
  - "isAnonymous" (boolean), "status" ('NEW', 'UNDER_REVIEW', 'RESOLVED'), "adminResponse" (text)

- **users** (table: "users"):
  - "id" (text), "username" (text), "email" (text), "role" ('ADMIN', 'HR', 'EMPLOYEE'), "isActive" (boolean), "isApproved" (boolean), "employeeId" (text)
  - NOTE: NEVER query or expose passwordHash or session token fields.

POSTGRESQL SYNTAX RULES:
1. Always wrap camelCase columns in double quotes: e.g. e."firstName", e."surname", e."dateOfBirth", e."departmentId", d."name".
2. Table names are in lowercase: "employees", "departments", "attendance_records", "leave_records", "payroll_records", "applicants", "performance_evaluations", "feedback_items", "users".
3. To calculate retirement eligibility, assume retirement age is 60 years old (e.g. \`EXTRACT(YEAR FROM age(CURRENT_DATE, "dateOfBirth")) >= 60\`).
4. JOIN employees with departments using \`e."departmentId" = d."id"\` when department names are requested.
5. All queries MUST be SELECT or WITH statements. Do not include semicolons.

GROUNDING & RESPONSE GUIDELINES:
1. Base your factual answers STRICTLY on the records retrieved via \`execute_read_query\`.
2. If the user greets or makes small talk (e.g. "Hi", "Hello"), reply politely and mention you are ready to query and analyze NMC-HR records.
3. If the user asks for data and no records match, state clearly: "No corresponding records were found in the database."
4. Format list or multi-column data using clean Markdown tables with bold column headers.
5. Format currency as ₱ (Philippine Peso) when referencing salaries, allowances, or functional rates.
6. Do NOT make up or assume records not present in the database results.

VISUAL ANALYTICS & CHARTING GUIDELINES:
When the user asks for a chart, graph, visualization, breakdown, trend, or analytics — OR when the database results are comparative, demographic, statistical, or time-series (e.g. headcount by department, gender distribution, attendance rates, salary averages, leave usage):
1. Provide an interactive visual chart embedded as a \`\`\`json:chart code block.
2. Accompany the chart with concise analytical observations (highlighting key insights, notable patterns, or recommendations).
3. The json:chart block MUST follow this exact JSON schema:
\`\`\`json:chart
{
  "type": "bar" | "donut" | "line",
  "title": "Descriptive Chart Title",
  "description": "Short explanation of what the chart illustrates",
  "metrics": [
    { "label": "Key Metric 1", "value": "Value 1" },
    { "label": "Key Metric 2", "value": "Value 2" }
  ],
  "xAxisKey": "category",
  "yAxisKey": "value",
  "data": [
    { "category": "Label A", "value": 10 },
    { "category": "Label B", "value": 25 }
  ]
}
\`\`\`
Chart Type Selection:
- "bar": Best for comparing categories, departments, roles, or counts.
- "donut": Best for distributions, proportions, ratios, or shares (e.g., gender, marital status, employment status, education levels). Data items should have "name" (or category) and "value".
- "line": Best for time trends, monthly trends, attendance over time, or sequential records.
Ensure numeric values are raw numbers (not strings with currency symbols or commas) in the "data" array. Use the "metrics" array for 1-4 top-line highlighted KPI badges.
`;

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChatParams {
  userId: string;
  message: string;
  history?: ChatMessageInput[] | undefined;
  res: Response;
}

function sendSseEvent(res: Response, type: string, data: Record<string, unknown>) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function streamChatWithDatabase({
  userId,
  message,
  history = [],
  res,
}: StreamChatParams): Promise<void> {
  const startTime = Date.now();
  const sourcesUsed: { query: string; rowCount: number }[] = [];
  let fullAnswer = '';

  try {
    // Send initial status event
    sendSseEvent(res, 'status', { message: 'Analyzing query...' });

    // Build message array for Anthropic
    const formattedMessages: Anthropic.MessageParam[] = [];

    // Add recent history (up to last 10 messages)
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
      if (h.role === 'user' || h.role === 'assistant') {
        formattedMessages.push({
          role: h.role,
          content: h.content,
        });
      }
    }

    // Append current user message
    formattedMessages.push({
      role: 'user',
      content: message,
    });

    // Step 1: Initial call to Claude with tool definition to check if DB query is needed
    const initialResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: [DB_QUERY_TOOL],
    });

    const toolUseBlocks = initialResponse.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    if (toolUseBlocks.length > 0) {
      sendSseEvent(res, 'status', {
        message:
          toolUseBlocks.length > 1
            ? `Querying database records (${toolUseBlocks.length} queries)...`
            : 'Querying database records...',
      });

      // Execute ALL tool use blocks and collect tool results for every tool_use_id
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        if (toolBlock.name === 'execute_read_query') {
          const input = toolBlock.input as { query?: string; explanation?: string };
          const rawSql = input.query || '';

          try {
            const execution = await executeReadOnlyQuery(rawSql);
            sourcesUsed.push({
              query: execution.queryUsed,
              rowCount: execution.rowCount,
            });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(execution.rows),
            });
          } catch (err) {
            const queryError = err instanceof Error ? err.message : 'Database query failed';
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify({ error: queryError }),
              is_error: true,
            });
          }
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: `Unknown tool: ${toolBlock.name}` }),
            is_error: true,
          });
        }
      }

      // Step 2: Feed tool results back to Claude and stream final answer
      formattedMessages.push({
        role: 'assistant',
        content: initialResponse.content,
      });

      formattedMessages.push({
        role: 'user',
        content: toolResults,
      });

      sendSseEvent(res, 'status', { message: 'Synthesizing response...' });

      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: formattedMessages,
      });

      stream.on('text', (textDelta) => {
        fullAnswer += textDelta;
        sendSseEvent(res, 'delta', { text: textDelta });
      });

      await stream.finalMessage();
    } else {
      // No tool call needed (e.g. conversational greeting or clarification)
      const directText = initialResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      fullAnswer = directText;
      sendSseEvent(res, 'delta', { text: directText });
    }

    const latencyMs = Date.now() - startTime;

    // Record audit in ai_query_logs
    try {
      await prisma.aiQueryLog.create({
        data: {
          userId,
          queryText: message,
          responseText: fullAnswer,
          latencyMs,
          ...(sourcesUsed.length > 0
            ? { sourcesUsed: sourcesUsed as unknown as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (logErr) {
      console.error('Failed to write AiQueryLog:', logErr);
    }

    sendSseEvent(res, 'done', { latencyMs });
    res.end();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred while generating the AI response';
    console.error('AI Stream Error:', error);
    sendSseEvent(res, 'error', { error: errorMessage });
    res.end();
  }
}
