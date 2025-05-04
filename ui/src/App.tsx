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

// Define the structure for our component list
interface AppComponentEntry {
  component: React.FC<DashboardProps>;
  filename: string; // Store the filename here
}

// Store components along with their filenames
const Apps: AppComponentEntry[] = [
  { component: BaselineA, filename: 'BaselineA.tsx' },
  { component: BaselineB, filename: 'BaselineB.tsx' },
  { component: ModelA, filename: 'ModelA.tsx' },
  { component: ModelB, filename: 'ModelB.tsx' },
  { component: ModelC, filename: 'ModelC.tsx' }
];

// Choose which component to render (0-indexed)
const selection: number = 0; // Example: Render BaselineA

// Get the selected entry (component + filename)
// Add validation to prevent out-of-bounds access
const selectedEntry = (selection >= 0 && selection < Apps.length)
  ? Apps[selection]
  : Apps[0]; // Default to the first entry if selection is invalid

const SelectedAppComponent = selectedEntry.component;
const selectedFilename = selectedEntry.filename;
// --- End Selection Logic ---


const App: React.FC = () => {
  const [isGmReady, setIsGmReady] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // State for the selected component index
  const [selectedIndex, setSelectedIndex] = useState<number>(0); // Default to first component

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

  // Get the currently selected component based on state
  const SelectedAppComponent = Apps[selectedIndex]?.component || Apps[0].component; // Fallback to first

  // Handler for dropdown change
  const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex < Apps.length) {
      setSelectedIndex(newIndex);
    }
  };

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

  const ConfigUI = () => (
    <div id="dashboard">
      {/* Dropdown Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="app-selector" style={{ fontWeight: 'bold' }}>Select Test Component:</label>
        <select
          id="app-selector"
          value={selectedIndex}
          onChange={handleSelectionChange}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {Apps.map((appEntry, index) => (
            <option key={index} value={index}>
              {appEntry.filename}
            </option>
          ))}
        </select>
      </div>

      <hr style={{ marginBottom: '20px' }} />

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
