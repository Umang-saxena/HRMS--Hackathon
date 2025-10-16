'use client';

import { useState } from 'react';
import { Bot, Send, Sparkles, Brain, Users, TrendingUp, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your HR AI Assistant. I can help you with employee management, performance insights, learning recommendations, and HR analytics. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickActions = [
    { icon: Users, label: 'Employee Summary', query: 'Give me a summary of current employees' },
    { icon: TrendingUp, label: 'Performance Insights', query: 'Show me performance trends' },
    { icon: GraduationCap, label: 'Training Needs', query: 'What training programs should we prioritize?' },
    { icon: Brain, label: 'AI Recommendations', query: 'What are your top recommendations for HR improvements?' },
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
  };

  const generateAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('employee') && lowerQuery.includes('summary')) {
      return "Based on current data, you have a diverse workforce with strong representation across departments. Engineering has the highest headcount, followed by Marketing and Sales. Employee satisfaction is trending positively with a 12% increase from last month.";
    }

    if (lowerQuery.includes('performance')) {
      return "Performance metrics show positive trends:\n\n• Average rating: 4.2/5.0 (+0.3 from last quarter)\n• 68% of employees rated 'Good' or 'Excellent'\n• Engineering and Marketing departments leading in performance\n• 3 employees identified for promotion consideration\n\nRecommendation: Focus on skill development for employees in the 'Satisfactory' range.";
    }

    if (lowerQuery.includes('training') || lowerQuery.includes('learning')) {
      return "Top training priorities identified:\n\n1. **AI/ML Skills** - 65% skill gap in technical teams\n2. **Leadership Development** - 12 employees ready for advancement\n3. **Cybersecurity Awareness** - Company-wide compliance requirement\n4. **Communication Skills** - Beneficial for cross-functional teams\n\nThese recommendations are based on performance reviews and skill gap analysis.";
    }

    if (lowerQuery.includes('recommendation') || lowerQuery.includes('improve')) {
      return "Key HR Improvements:\n\n1. **Retention Focus** - Address turnover risk for 3 high-value employees\n2. **Skill Development** - Implement AI/ML training programs\n3. **Recognition Program** - Boost morale for high performers\n4. **Performance Reviews** - Increase frequency for timely feedback\n5. **Work-Life Balance** - Consider flexible work arrangements\n\nThese suggestions are prioritized by impact and feasibility.";
    }

    if (lowerQuery.includes('turnover') || lowerQuery.includes('retention')) {
      return "Turnover Risk Analysis:\n\n• 3 employees showing high risk indicators\n• Key factors: salary concerns, career growth, work-life balance\n• Recommended actions: salary review, career development plans, flexible schedules\n• Predicted retention improvement: 85% with interventions\n\nWould you like detailed recommendations for specific employees?";
    }

    return "I understand you're asking about: " + query + "\n\nI can help with:\n• Employee analytics and summaries\n• Performance trends and insights\n• Training and development recommendations\n• Turnover risk analysis\n• Department-specific insights\n\nCould you provide more specific details about what you'd like to know?";
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">AI Assistant</h1>
        <p className="text-slate-600 mt-1">Get intelligent insights and recommendations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card
            key={index}
            className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleQuickAction(action.query)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100">
                  <action.icon className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">{action.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 border-slate-200 flex flex-col">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>HR AI Assistant</CardTitle>
              <CardDescription>Powered by advanced AI analytics</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback
                  className={
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                      : 'bg-gradient-to-br from-slate-600 to-slate-700 text-white'
                  }
                >
                  {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : 'U'}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex-1 px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white ml-12'
                    : 'bg-slate-100 text-slate-900 mr-12'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-slate-500'}`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 bg-slate-100 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-slate-200">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about HR..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-powered insights based on your organization's data
          </p>
        </div>
      </Card>
    </div>
  );
}
