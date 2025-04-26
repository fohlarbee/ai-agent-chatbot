import React from 'react'
import { Id } from '../../../../../convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getConvexClient } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';
import ChatInterface from '@/app/_components/ChatInterface';

type Props = {
    params: Promise<{chatId: Id<"chats"> }>
}
const ChatPage = async (params: Props) => {
    const { chatId } = await params.params;
    const {userId} = await auth();

    if (!userId) redirect('/');

    const convex = await getConvexClient();
    // Check if chat exists & user is authorized to view it
    try {
      const chat = await convex.query(api.chats.getChat, {
        id: chatId,
        userId,
      });
  
      if (!chat) {
        console.log(
          "⚠️ Chat not found or unauthorized, redirecting to dashboard..."
        );
        redirect("/dashboard");
    }
      
      
    } catch (error) {
      console.error("🔥 Error fetching chat:", error);
      // redirect("/dashboard");
      
    }
    



    const initialMessages = await convex.query(api.messages.list, { chatId });
    return (
      <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} initialMessages={initialMessages} />
      </div>
    );
}

export default ChatPage;