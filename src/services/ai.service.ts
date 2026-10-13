import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import type { Prisma } from '../generated/prisma/index.js';
import { AiMessageRole } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import * as aiRepository from '../repositories/ai.repository.js';
import { getAiSystemPrompt } from '../utils/aiSchemaGenerator.js';
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


export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChatParams {
  userId: string;
  message: string;
  conversationId?: string | undefined;
  history?: ChatMessageInput[] | undefined;
  res: Response;
}

function sendSseEvent(res: Response, type: string, data: Record<string, unknown>) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function generateTitleFromMessage(message: string): string {
  const cleaned = message.replace(/^[#*\-•\s\d.]+/, '').trim();
  const firstLine = cleaned.split('\n')[0] || cleaned;
  if (firstLine.length <= 45) {
    return firstLine || 'New Conversation';
  }
  return `${firstLine.slice(0, 42).trim()}...`;
}

// ---------------------------------------------------------------------------
// Conversation Management Services
// ---------------------------------------------------------------------------

export async function listUserConversations(userId: string) {
  const conversations = await aiRepository.listConversationsByUserId(userId);
  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c._count.messages,
    lastMessage: c.messages[0]?.content ?? null,
  }));
}

export async function getUserConversation(id: string, userId: string) {
  const conversation = await aiRepository.findConversationById(id, userId);
  if (!conversation) {
    throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  }

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
      sourcesUsed: m.sourcesUsed,
      createdAt: m.createdAt,
    })),
  };
}

export async function renameUserConversation(id: string, userId: string, title: string) {
  const result = await aiRepository.updateConversationTitle(id, userId, title);
  if (result.count === 0) {
    throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  }
  return { id, title };
}

export async function deleteUserConversation(id: string, userId: string) {
  const result = await aiRepository.deleteConversation(id, userId);
  if (result.count === 0) {
    throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  }
  return { success: true };
}

export async function clearAllUserConversations(userId: string) {
  await aiRepository.deleteAllConversations(userId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Streaming AI Chat with Automatic Persistence
// ---------------------------------------------------------------------------

export async function streamChatWithDatabase({
  userId,
  message,
  conversationId,
  history,
  res,
}: StreamChatParams): Promise<void> {
  const startTime = Date.now();
  const sourcesUsed: { query: string; rowCount: number }[] = [];
  let fullAnswer = '';
  let activeConversationId = conversationId;

  try {
    // If no conversationId provided, or the conversationId doesn't exist, create a new conversation
    if (activeConversationId) {
      const existing = await aiRepository.findConversationById(activeConversationId, userId);
      if (!existing) {
        // Fallback: create fresh conversation
        const title = generateTitleFromMessage(message);
        const newConv = await aiRepository.createConversation({ userId, title });
        activeConversationId = newConv.id;
      }
    } else {
      const title = generateTitleFromMessage(message);
      const newConv = await aiRepository.createConversation({ userId, title });
      activeConversationId = newConv.id;
    }

    // Persist the user message to database
    await aiRepository.createMessage({
      conversationId: activeConversationId,
      role: AiMessageRole.USER,
      content: message,
    });

    // Notify client of the active conversation ID immediately
    sendSseEvent(res, 'conversation', {
      conversationId: activeConversationId,
    });

    // Send initial status event
    sendSseEvent(res, 'status', { message: 'Analyzing query...' });

    // Determine message history for Claude context window
    const formattedMessages: Anthropic.MessageParam[] = [];

    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const h of recentHistory) {
        if (h.role === 'user' || h.role === 'assistant') {
          formattedMessages.push({
            role: h.role,
            content: h.content,
          });
        }
      }
    } else {
      // Pull recent messages from DB for multi-turn context (excluding the one just inserted)
      const recentDbMessages = await aiRepository.getRecentMessages(activeConversationId, 10);
      // The last one in recentDbMessages is the current user message, so take all but last
      const priorMessages = recentDbMessages.slice(0, -1);
      for (const m of priorMessages) {
        formattedMessages.push({
          role: m.role === AiMessageRole.USER ? 'user' : 'assistant',
          content: m.content,
        });
      }
    }

    // Append current user message
    formattedMessages.push({
      role: 'user',
      content: message,
    });

    // Step 1: Initial call to Claude with tool definition to check if DB query is needed
    let currentResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.1,
      system: getAiSystemPrompt(),
      messages: formattedMessages,
      tools: [DB_QUERY_TOOL],
    });

    let toolUseBlocks = currentResponse.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    // If Claude requested tools, execute them (supports up to 4 query rounds with error recovery)
    let round = 0;
    while (toolUseBlocks.length > 0 && round < 4) {
      round++;
      sendSseEvent(res, 'status', {
        message:
          round === 1
            ? toolUseBlocks.length > 1
              ? `Querying database records (${toolUseBlocks.length} queries)...`
              : 'Querying database records...'
            : `Refining records (step ${round} of 4)...`,
      });

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
              content: JSON.stringify({
                error: queryError,
                hint: 'Please review table names and wrap any camelCase column names in double quotes (e.g. e."firstName", pr."grossPay", pr."netPay"). Then self-correct the query.',
              }),
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

      formattedMessages.push({
        role: 'assistant',
        content: currentResponse.content,
      });

      formattedMessages.push({
        role: 'user',
        content: toolResults,
      });

      // If we have query rounds remaining, check if Claude needs a follow-up query before final synthesis
      if (round < 4) {
        const nextCheck = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          temperature: 0.1,
          system: getAiSystemPrompt(),
          messages: formattedMessages,
          tools: [DB_QUERY_TOOL],
        });

        const nextToolUse = nextCheck.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        if (nextToolUse.length > 0) {
          currentResponse = nextCheck;
          toolUseBlocks = nextToolUse;
          continue;
        } else {
          break;
        }
      }
    }

    if (round > 0) {
      sendSseEvent(res, 'status', { message: 'Synthesizing response...' });

      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        temperature: 0.1,
        system: getAiSystemPrompt(),
        messages: formattedMessages,
      });

      stream.on('text', (textDelta) => {
        fullAnswer += textDelta;
        sendSseEvent(res, 'delta', { text: textDelta });
      });

      await stream.finalMessage();
    } else {
      // No tool call needed (e.g. conversational greeting or clarification)
      const directText = currentResponse.content
        .filter((b): b is Anthropic.ToolUseBlock | Anthropic.TextBlock => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('\n');

      fullAnswer = directText;
      sendSseEvent(res, 'delta', { text: directText });
    }

    const latencyMs = Date.now() - startTime;

    // Persist assistant message to database
    try {
      await aiRepository.createMessage({
        conversationId: activeConversationId,
        role: AiMessageRole.ASSISTANT,
        content: fullAnswer,
        ...(sourcesUsed.length > 0
          ? { sourcesUsed: sourcesUsed as unknown as Prisma.InputJsonValue }
          : {}),
      });
    } catch (saveErr) {
      console.error('Failed to persist assistant message:', saveErr);
    }

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

    sendSseEvent(res, 'done', {
      latencyMs,
      conversationId: activeConversationId,
    });
    res.end();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred while generating the AI response';
    console.error('AI Stream Error:', error);
    sendSseEvent(res, 'error', { error: errorMessage });
    res.end();
  }
}
