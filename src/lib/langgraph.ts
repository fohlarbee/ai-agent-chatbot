import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {ToolNode} from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import SYSTEM_MESSAGE from "../../constants/systemMessage";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";

// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});


// https://introspection.apis.stepzen.com/customers

// Connect to wxflows
const toolClient = new wxflows({
    endpoint: process.env.WXFLOWS_ENDPOINT || "",
    apikey: process.env.WXFLOWS_APIKEY,
  });
  
  // Retrieve the tools
  const tools = await toolClient.lcTools;
  const toolNode = new ToolNode(tools);
const initialModel = () => {
    const model = new ChatGoogleGenerativeAI({
        // model:"command-r-plus-08-2024",
        model:'',
        
        apiKey: process.env.COHERE_API_KEY,
        temperature: 0.7,
        streaming:true,
        // maxConcurrency:4096,
        cache:true,
    
        // callbacks: [
        //     {
        //       handleLLMStart: async () => {
        //         // console.log("🤖 Starting LLM call");
        //       },
        //       handleLLMEnd: async (output) => {
        //         console.log("🤖 End LLM call", output);
        //         const usage = output.llmOutput?.usage;
        //         if (usage) {
        //           console.log("📊 Token Usage:", {
        //             input_tokens: usage.input_tokens,
        //             output_tokens: usage.output_tokens,
        //             total_tokens: usage.input_tokens + usage.output_tokens,
        //             cache_creation_input_tokens:
        //               usage.cache_creation_input_tokens || 0,
        //             cache_read_input_tokens: usage.cache_read_input_tokens || 0,
        //           });
        //         }
        //       },
        //       handleLLMNewToken: async (token: string) => {
        //         // console.log("🔤 New token:", token);
        //       },
        //     },
        //   ],
    }).bindTools(tools);
    console.log("🤖 Model initialized:", model);
    return model;
};  

// Define the function that determines whether to continue or not
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // If the last message is a tool message, route back to agent
  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent";
  }

  // Otherwise, we stop (reply to the user)
  return END;
}


const createWorkflow = () => {
  const model = initialModel();
  console.log("🤖 Model initialized:", model);
  const stateGraph = new StateGraph(MessagesAnnotation).addNode(
    "agent",
    async (state) => {
      // Create the system message content

      const systemContent = SYSTEM_MESSAGE;

      // Create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent, {
          cache_control: { type: "ephemeral" },
        }),
        new MessagesPlaceholder("messages"),
      ]);

      // Trim the messages to manage conversation history
      const trimmedMessages = await trimmer.invoke(state.messages);

        
      // Format the prompt with the current messages
      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

      // Get response from the model
      const response = await model.invoke(prompt);
      console.log("🤖 Model response:", response);

      return { messages: [response] };
    }
    
    
  ).addNode('tools', toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)


    return stateGraph;
  
}

function addCachingHeaders(messages: BaseMessage[]): BaseMessage[] {
  if (!messages.length) return messages;

  // Create a copy of messages to avoid mutating the original
  const cachedMessages = [...messages];

  // Helper to add cache control
  const addCache = (message: BaseMessage) => {
    message.content = [
      {
        type: "text",
        text: message.content as string,
        cache_control: { type: "ephemeral" },
      },
    ];
  };

  // Cache the last message
  // console.log("🤑🤑🤑 Caching last message");
  addCache(cachedMessages.at(-1)!);

  // Find and cache the second-to-last human message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        // console.log("🤑🤑🤑 Caching second-to-last human message");
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
}

export async function submitQuestion(messages: BaseMessage[], chatId: string) {
  // Add caching headers to messages
  const cachedMessages = addCachingHeaders(messages);
  // console.log("🔒🔒🔒 Messages:", cachedMessages);

  // Create workflow with chatId and onToken callback
  const workflow = createWorkflow();

  // Create a checkpoint to save the state of the conversation
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });

  const stream = await app.streamEvents(
    { messages: cachedMessages },
    {
      version: "v2",
      configurable: { thread_id: chatId },
      streamMode: "messages",
      runId: chatId,
    }
  );
  return stream;
}