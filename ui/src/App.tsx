import React, { useState, useEffect } from "react";
import "./App.css";
// Import service functions and types
import { checkGmReady, setConfig, getConfig, Config } from "./services/configService";

// --- Import Candidate Components ---
// Ensure these paths are correct and the components exist
import BaselineA from './responses/BaselineA';
import BaselineB from './responses/BaselineB';
import ModelA from './responses/ModelA';
import ModelB from './responses/ModelB';
import ModelC from './responses/ModelC';
// --- End Imports ---

// --- Define Props for Dashboard Components ---
// (Could be in a separate types file)
export interface DashboardProps {
  getConfig: () => Promise<Config>;
  setConfig: (config: Config) => Promise<void>;
}
// --- End Props Definition ---


// --- Component Selection Logic ---
// Choose which component to render (0-indexed)
// IMPORTANT: Make sure the index is valid for the Apps array!
const selection: number = 0; // Example: Render BaselineA
const Apps: React.FC<DashboardProps>[] = [
  BaselineA,
  BaselineB,
  ModelA,
  ModelB,
  ModelC
];
// Check if selection is valid, otherwise default to the first one or handle error
const SelectedAppComponent = Apps[selection] || Apps[0];
// --- End Selection Logic ---


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

  // Setup Instructions Component (remains the same as before)
  const SetupInstructions = () => (
    <div className="setup-instructions" style={{ padding: "20px", border: "1px solid orange", margin: "10px" }}>
      <h2>Chat Clapper Setup Required!</h2>
      {/* ... content of setup instructions ... */}
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

  // ConfigUI now renders the selected component and passes props
  const ConfigUI = () => (
    <div style={{ padding: "20px" }}>
      <h1>Chat Clapper Configurator (Testing: {SelectedAppComponent.name || `App ${selection}`})</h1>
      {/* Render the selected component, passing service functions as props */}
      <SelectedAppComponent
        getConfig={getConfig}
        setConfig={setConfig}
      />
    </div>
  );

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
