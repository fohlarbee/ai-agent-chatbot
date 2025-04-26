"use client";

import React from 'react'
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ChatRequestBody } from '@/lib/types';


interface ChatInterfaceProps {
    chatId: Id<"chats">;
    initialMessages: Doc<"messages">[];
  }
const ChatInterface = ({
    chatId,
    initialMessages,
  }: ChatInterfaceProps
) => {

    const [messages, setMessages] = React.useState<Doc<"messages">[]>(initialMessages);
    const [input, setInput] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [streamedResponse, setStreamedResponse] = React.useState("");
    const [currentTool, setCurrentTool] = React.useState<{
      name: string;
      input: unknown;
    } | null>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamedResponse]);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading) return;
  
      // Reset UI state for new message
      setInput("");
      setStreamedResponse("");
      setCurrentTool(null);
      setIsLoading(true);

      // Add user's message immediately for better UX
      const optimisticUserMessage: Doc<"messages"> = {
        _id: `temp_${Date.now()}`,
        chatId,
        content: trimmedInput,
        role: "user",
        createdAt: Date.now(),
      } as Doc<"messages">;

      setMessages((prev) => [...prev, optimisticUserMessage]);

       // Track complete response for saving to database
       let fullResponse = "";

      // Simulate streaming response  
      try {
        // Prepare chat history and new message for API
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimmedInput,
        chatId,
      };

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });


      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");
      } catch (error) {
        // Handle any errors during streaming
        console.error("Error sending message:", error);
        // Remove the optimistic user message if there was an error
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== optimisticUserMessage._id)
        );
        setStreamedResponse(
          'error'
          // formatTerminalOutput(
          //   "error",
          //   "Failed to process message",
          //   error instanceof Error ? error.message : "Unknown error"
          // )
        );
        
      }finally{
        setIsLoading(false);
      }
    }
  return (
   <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
    {/* messages */}
    <section className='flex-1'>
      <div className='w-full flex flex-col mx-auto max-w-4xl h-full overflow-y-auto p-4'>
        {messages.map((message) => (
            <div 
            key={message._id} 
            className={`p-4 ${message.role === 'user' ? 'bg-blue-100 rounded-lg my-2 w-54 self-end' : 'bg-gray-100 self-start'} `}
            style={{ maxWidth: '70%' }}
            >
            <p>{message.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
    </section>

    {/* footer input */}
    <footer className='border-t border-gray-200 p-4'>
        <form className='max-w-4xl mx-auto relative' onSubmit={handleSubmit} >
        <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={` cursor-pointer absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all 
                ${
                input.trim()
                  ? "bg-blue-400/80 hover:bg-blue-700 text-[#fff] shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }
              `}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
    </footer>

   </main>
  )
}

export default ChatInterface