import { useState, useEffect } from "react";
import "./App.css";
import { checkGmReady } from "./services/configService"; // Import the checker

function App() {
  const [isGmReady, setIsGmReady] = useState(false);
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    const ready = checkGmReady();
    setIsGmReady(ready);
    if (!ready) {
      try {
        if (typeof window !== "undefined") {
          setFileUrl(window.location.href);
        }
      } catch (e: unknown) {
        console.warn("UI: Could not determine file URL.", e);
      }
      console.warn("UI: GM_* functions NOT detected. Displaying setup instructions.");
    } else {
      console.log("UI: GM_* functions detected. Ready for configuration.");
    }
  }, []);

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
            <li>Click "Chat Clapper" script name to edit.</li>
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
    <div style={{ padding: "20px" }}>
      <h1>Chat Clapper Configurator</h1>
      <p style={{ color: "green" }}>✅ Script connection ready. Build the real UI here!</p>
      {/* --- TODO: Replace this with your actual UI components --- */}
      <textarea style={{ width: "95%", height: "400px", marginTop: "10px" }} placeholder="Your UI Components Go Here... (Global Settings, Site Tabs, User Lists, HTML Analyzer, Selectors, Save Buttons etc.)"></textarea>
      {/* --- End of TODO --- */}
    </div>
  );

  return (
    <>
      {!isGmReady && <SetupInstructions />}
      {isGmReady && <ConfigUI />}
    </>
  );
}

export default App;