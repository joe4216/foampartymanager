import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Loader2, User, Bot } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  bookingInfo?: {
    id: number;
    customerName: string;
    email: string;
    phone: string;
    packageType: string;
    eventDate: string;
    eventTime: string;
    status: string;
  };
  actions?: string[];
}

interface ChatResponse {
  message: string;
  bookingInfo?: Message["bookingInfo"];
  actions?: string[];
  sessionVerified?: boolean;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm the Foam Works Party Co assistant. I can help you with:\n\n• View or update your booking\n• Reschedule your event\n• Cancel a booking\n• Get information about our packages\n• Contact the owner\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        message: userMessage,
        sessionEmail,
        conversationHistory: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        bookingInfo: data.bookingInfo,
        actions: data.actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (data.sessionVerified && data.bookingInfo?.email) {
        setSessionEmail(data.bookingInfo.email);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again or contact us directly at our phone number.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(action);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
          data-testid="button-chat-launch"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[550px] flex flex-col shadow-2xl z-50 border-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">Foam Works Assistant</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
              data-testid="button-chat-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                      data-testid={`chat-message-${message.role}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.bookingInfo && (
                        <div className="mt-3 p-2 bg-background rounded border text-foreground">
                          <p className="font-semibold text-sm">{message.bookingInfo.packageType}</p>
                          <p className="text-xs text-muted-foreground">
                            {message.bookingInfo.eventDate} at {message.bookingInfo.eventTime}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {message.bookingInfo.status}
                          </Badge>
                        </div>
                      )}
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.actions.map((action) => (
                            <Button
                              key={action}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleQuickAction(action)}
                              data-testid={`chat-action-${action.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {chatMutation.isPending && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={chatMutation.isPending}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending}
                  size="icon"
                  data-testid="button-chat-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
