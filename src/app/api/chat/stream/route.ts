import { getConvexClient } from "@/lib/convex";
import {
  ChatRequestBody,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
  StreamMessage,
  StreamMessageType,
} from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { start } from "repl";
import { api } from "../../../../../convex/_generated/api";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { submitQuestion } from "@/lib/langgraph";

function sendSSEMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) {
  const encoder = new TextEncoder();
  return writer.write(
    encoder.encode(
      `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
    )
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { messages, newMessage, chatId } = body as ChatRequestBody;

  try {
    const convex = getConvexClient();

    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    const res = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
    const startStream = async () => {
      try {
        console.log("Starting stream...");
        // Send the initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });
        //Store user message to DB
        await (
          await convex
        ).mutation(api.messages.send, {
          chatId,
          content: newMessage,
        });

        // Convert messages to langchain format
        const langchainMessages = [
          ...messages.map((msg) => 
          msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
        ),
        new HumanMessage(newMessage),
        ]

        try {
             // Create the event stream
             const eventStream = await submitQuestion(langchainMessages, chatId);

             // Process the events
          for await (const event of eventStream) {
            console.log("🔄 Event:", event);

            if (event.event === "on_chat_model_stream") {
              const token = event.data.chunk;
              if (token) {
                // Access the text property from the AIMessageChunk
                const text = token.content.at(0)?.["text"];
                if (text) {
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.Token,
                    token: text,
                  });
                }
              }
            } else if (event.event === "on_tool_start") {
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolStart,
                tool: event.name || "unknown",
                input: event.data.input,
              });
            } else if (event.event === "on_tool_end") {
              const toolMessage = new ToolMessage(event.data.output);

              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolEnd,
                tool: toolMessage.lc_kwargs.name || "unknown",
                output: event.data.output,
              });
            }
          }

          // Send completion message without storing the response
          await sendSSEMessage(writer, { type: StreamMessageType.Done });
          
        } catch (streamError)   {
          console.error("Error in event stream:", streamError);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              streamError instanceof Error
                ? streamError.message
                : "Stream processing failed",
          });
        }
      } catch (error) {
          console.error("Error in stream:", error);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error: error instanceof Error ? error.message : "Unknown error",
          });
      } finally{
          try {
            await writer.close();
          } catch (closeError) {
            console.error("Error closing writer:", closeError);
          }
        }
    };

    await startStream();

    return res;
  } catch (error) {}
}
