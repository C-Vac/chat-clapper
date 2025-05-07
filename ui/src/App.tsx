// src/App.tsx
import React, { useState, useEffect, Suspense, ErrorInfo } from "react";
import "./App.css";
// Import service functions and types
import { checkGmReady, setConfig, getConfig } from "./services/configService";
import type { Config } from "./services/configService"; // Ensure Config is exported from configService

// Import the new candidate manifest and types
import { candidateManifest, CandidateKey } from "./candidateComponents"; // Adjust path if needed

// --- Define Props for Dashboard Components ---
// This definition can stay here or be moved to a shared types file (e.g., types.ts)
// and then imported here and in candidateComponents.ts
export interface AppProps {
  getConfig: () => Promise<Config>;
  setConfig: (config: Config) => Promise<void>;
  // If you add getRecentBlockedMessages, include it here
}
// --- End Props Definition ---


// --- Basic Error Boundary Component ---
// (Consider moving to its own file: ErrorBoundary.tsx)
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

  const candidateKeys = Object.keys(candidateManifest) as CandidateKey[];
  // State for the selected component key (e.g., 'BaselineA', 'ModelB')
  const [selectedKey, setSelectedKey] = useState<CandidateKey>(candidateKeys[0] || '');

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

  const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKey(event.target.value as CandidateKey);
  };

  // Setup Instructions Component (remains the same)
  const SetupInstructions = () => (
    <div className="setup-instructions" style={{ padding: "20px", border: "1px solid orange", margin: "10px" }}>
      <h2>Chat Clapper Setup Required!</h2>
      <p>Yo! Looks like the Chat Clapper userscript isnt running on this page yet. Follow these steps:</p>
      <ol style={{ lineHeight: "1.6" }}>
        <li><strong>Install the Script:</strong> Find <code>chat-clapper.user.js</code> (in the <code>script</code> folder where you found this page). Drag & drop it onto your Tampermonkey Dashboard tab, OR use Tampermonkey &gt; Utilities &gt; Install from file.</li>
        <li><strong>Allow Script Here:</strong> The script needs permission to run on *this* page to save settings.
          <ol type="a" style={{ marginTop: "5px" }}>
            <li><strong>Copy this pages exact path:</strong>
              <input type="text" value={fileUrl || "Could not detect URL - open via file:/// path"} readOnly style={{ width: "95%", margin: "5px 0", padding: "3px", display: "block" }} onClick={(e) => (e.target as HTMLInputElement).select()} />
              {!fileUrl && <p style={{ color: "orange", fontSize: "0.9em" }}>Make sure you opened this HTML file using a <code>file:///...</code> path directly!</p>}
            </li>
            <li>Go to Tampermonkey Dashboard.</li>
            <li>Click "Chat Clapper 3000" script name to edit (ensure it's the correct script).</li>
            <li>Click the "Settings" tab.</li>
            <li>Under "User Matches", click "Add".</li>
            <li>Paste the path you copied into the box.</li>
            <li>Click the Save icon (💾).</li>
          </ol>
        </li>
        <li><strong>Reload This Page:</strong> Once script installed & match rule saved, click below.</li>
      </ol>
      <button onClick={() => window.location.reload()} style={{ padding: "10px", marginTop: "10px" }}>Reload Config Page</button>
      <p style={{ marginTop: "1em", fontSize: "0.8em" }}>Still seeing this after reload? Double-check the <code>@match</code> rule you added matches the path above *exactly*.</p>
    </div>
  );


  const ConfigUI = () => {
    // Get the selected lazy component based on the key
    const currentCandidateEntry = selectedKey ? candidateManifest[selectedKey] : null;
    const SelectedLazyComponent = currentCandidateEntry?.lazyComponent;

    if (!SelectedLazyComponent) {
      return <div>Please select a component.</div>; // Or some other placeholder/error
    }

    return (
      <div id="dashboard">
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="app-selector" style={{ fontWeight: 'bold' }}>Select Test Component:</label>
          <select
            id="app-selector"
            value={selectedKey}
            onChange={handleSelectionChange}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {candidateKeys.map((key) => (
              <option key={key} value={key}>
                {candidateManifest[key].filename} ({candidateManifest[key].description || key})
              </option>
            ))}
          </select>
        </div>
        <hr style={{ marginBottom: '20px' }} />

        {/* Use ErrorBoundary and Suspense to render the lazy component */}
        <StandardErrorBoundary fallbackUI={<div>Error loading component: {currentCandidateEntry?.filename}</div>}>
          <Suspense fallback={<div>Loading {currentCandidateEntry?.filename}...</div>}>
            <SelectedLazyComponent
              getConfig={getConfig}
              setConfig={setConfig}
            />
          </Suspense>
        </StandardErrorBoundary>
      </div>
    );
  };

  if (isLoading) {
    return <div>Checking environment...</div>;
  }

  return (
    <>
      {!isGmReady && <SetupInstructions />}
      {isGmReady && <ConfigUI />}
    </>
  );
}

export default App;