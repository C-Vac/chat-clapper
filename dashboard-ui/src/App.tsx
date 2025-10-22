// src/App.tsx
import React, { useState, useEffect, ErrorInfo } from "react";
import "./App.css";
// Import service functions and types
import { checkGmReady, setConfig, getConfig, getMessageHistory } from "./services/configService";
import type { Config, BlockedMessage } from "./services/configService";

// Import the new candidate manifest and types
import Dashboard from "./Dashboard";
import SetupInstructions from "./SetupInstructions";

// --- Define Props for Dashboard Components ---
// This definition can stay here or be moved to a shared types file (e.g., types.ts)
// and then imported here and in candidateComponents.ts
export interface AppProps {
  getConfig: () => Promise<Config>;
  setConfig: (config: Config) => Promise<void>;
  getMessageHistory: (limit: number) => Promise<BlockedMessage[]>;
}
// --- End Props Definition ---


// --- Basic Error Boundary Component ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackUI?: React.ReactElement;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class StandardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // You could log this to an external service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallbackUI || (
        <div>
          <h2>Something went wrong.</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
// --- End Error Boundary ---


const App: React.FC = () => {
  const [isGmReady, setIsGmReady] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ready = checkGmReady();
    setIsGmReady(ready);
    setIsLoading(false);

    if (!ready) {
      try {
        if (typeof window !== "undefined") {
          setFileUrl(window.location.href);
        }
      } catch (e: unknown) {
        console.warn("UI: Could not determine file URL.", e);
      }
      console.warn("UI: Bridged GM functions NOT detected via configService. Displaying setup instructions.");
    } else {
      console.log("UI: Bridged GM functions detected via configService. Ready for configuration.");
    }
  }, []);


  if (isLoading) {
    return <div>Checking environment...</div>;
  }

  return (
    <StandardErrorBoundary>
      {!isGmReady && <SetupInstructions fileUrl={fileUrl} />}
      {isGmReady && <Dashboard
        setConfig={setConfig}
        getConfig={getConfig}
        getMessageHistory={getMessageHistory} />}
    </StandardErrorBoundary>
  );
}

export default App;