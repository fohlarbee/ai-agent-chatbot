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
        // Send the initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });
        //Store user message to DB
        await (
          await convex
        ).mutation(api.messages.send, {
          chatId,
          content: newMessage,
        });
      } catch (error) {
        return NextResponse.json(
          { error: "Error in streaming" },
          { status: 500 }
        );
      }
    };

    await startStream();

    return res;
  } catch (error) {}
}
