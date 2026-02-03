import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import WidgetOnly from "@/pages/WidgetOnly";
import TestEmbed from "@/pages/TestEmbed";
import WebflowEmbed from "@/pages/WebflowEmbed";
import WidgetButton from "@/pages/WidgetButton";
import WidgetFull from "@/pages/WidgetFull";
import EmbedTest from "@/pages/EmbedTest";
import ButtonOnly from "@/pages/ButtonOnly";
import HostedEmbedTest from "@/pages/HostedEmbedTest";
import Analytics from "@/pages/Analytics";
import Admin from "@/pages/Admin";
import ConversationDetail from "@/pages/ConversationDetail";
import { useEffect, useState, createContext, useContext } from "react";

const AUTH_STORAGE_KEY = 'lumi-admin-auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(password);
    
    if (!success) {
      setError('Incorrect password');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-slate-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Admin Access</CardTitle>
          <CardDescription className="text-slate-600">
            Enter the admin password to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:border-slate-400"
                data-testid="input-password"
              />
              {error && (
                <p className="text-sm text-red-500" data-testid="text-error">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-slate-800 hover:bg-slate-700"
              disabled={isLoading || !password}
              data-testid="button-login"
            >
              {isLoading ? 'Checking...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return <>{children}</>;
}

function RouteTracker() {
  const [location] = useLocation();
  
  useEffect(() => {
    document.documentElement.setAttribute('data-route', location);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin">
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/conversation/:id">
        {(params) => (
          <ProtectedRoute>
            <ConversationDetail />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/widget" component={WidgetOnly} />
      <Route path="/widget-only" component={WidgetOnly} />
      <Route path="/button-only" component={ButtonOnly} />
      <Route path="/embed-test" component={EmbedTest} />
      <Route path="/hosted-embed-test" component={HostedEmbedTest} />
      <Route path="/test-embed" component={TestEmbed} />
      <Route path="/webflow-embed" component={WebflowEmbed} />
      <Route path="/widget-button" component={WidgetButton} />
      <Route path="/widget-full" component={WidgetFull} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouteTracker />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
