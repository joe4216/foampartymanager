import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, Mail, Bot, Database, Server, ExternalLink } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-['Poppins'] mb-2">Integrations & Services</h1>
        <p className="text-muted-foreground">Services powering your foam party business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card data-testid="integration-stripe">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Stripe</CardTitle>
                <CardDescription>Payment Processing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per transaction:</span>
                <span className="font-medium">2.9% + $0.30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used for:</span>
                <span className="font-medium">Card payments</span>
              </div>
            </div>
            <a 
              href="https://dashboard.stripe.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
              data-testid="link-stripe-dashboard"
            >
              View Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card data-testid="integration-resend">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Resend</CardTitle>
                <CardDescription>Email Service</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free tier:</span>
                <span className="font-medium">3,000 emails/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pro plan:</span>
                <span className="font-medium">$20/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used for:</span>
                <span className="font-medium">Booking confirmations</span>
              </div>
            </div>
            <a 
              href="https://resend.com/domains" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
              data-testid="link-resend-dashboard"
            >
              View Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card data-testid="integration-openai">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">OpenAI</CardTitle>
                <CardDescription>AI Chatbot & Receipt Analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per request:</span>
                <span className="font-medium">~$0.01-0.03</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">GPT-4o-mini</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used for:</span>
                <span className="font-medium">Chatbot, Venmo scan</span>
              </div>
            </div>
            <a 
              href="https://platform.openai.com/usage" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
              data-testid="link-openai-usage"
            >
              View Usage <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card data-testid="integration-neon">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Neon</CardTitle>
                <CardDescription>PostgreSQL Database</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free tier:</span>
                <span className="font-medium">0.5 GB storage</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pro plan:</span>
                <span className="font-medium">Usage-based</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used for:</span>
                <span className="font-medium">All app data</span>
              </div>
            </div>
            <a 
              href="https://console.neon.tech" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
              data-testid="link-neon-console"
            >
              View Console <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card data-testid="integration-railway">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Server className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Railway</CardTitle>
                <CardDescription>App Hosting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hobby usage:</span>
                <span className="font-medium">~$5/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Includes:</span>
                <span className="font-medium">SSL, Custom domain</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used for:</span>
                <span className="font-medium">Production hosting</span>
              </div>
            </div>
            <a 
              href="https://railway.app/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
              data-testid="link-railway-dashboard"
            >
              View Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-['Poppins']">Estimated Monthly Costs</CardTitle>
          <CardDescription>Based on typical usage for a small foam party business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Railway Hosting</span>
              <span className="font-medium">~$5/month</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Resend Emails (under 3k/mo)</span>
              <span className="font-medium text-green-600">Free</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Neon Database (under 0.5GB)</span>
              <span className="font-medium text-green-600">Free</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>OpenAI (est. 100 requests/mo)</span>
              <span className="font-medium">~$1-3/month</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Stripe (per booking)</span>
              <span className="font-medium">2.9% + $0.30</span>
            </div>
            <div className="flex justify-between items-center py-2 font-bold text-lg">
              <span>Estimated Total (excluding Stripe fees)</span>
              <span>~$6-8/month</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
