import React from "react";
import { useState } from "react";
import { initialize } from "../src/index";

const DEFAULT_BASE_URL = "http://localhost:3000";

function App() {
  const [url, setUrl] = useState(DEFAULT_BASE_URL);
  return (
    <div style={{ padding: 10 }}>
      <h1>Trench SDK Testing</h1>
      <div>
        <div>
          <span>Dashboard URL: </span>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
          />
        </div>
        <div style={{ height: 20 }}></div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div>
            <button
              onClick={() => {
                initialize(`${url}`, "transactionId123");
              }}
            >
              Initialize Session
            </button>
            <span> Sends device data to url/api/dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
