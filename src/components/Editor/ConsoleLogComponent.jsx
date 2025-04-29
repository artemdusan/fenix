import { useEffect, useRef } from "react";
import "./styles/ConsoleLogComponent.css";

function ConsoleLogComponent({ logs = [], logColors = [] }) {
  const logsEndRef = useRef(null);

  // Auto-scroll to the bottom when logs update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="console-log" ref={logsEndRef}>
      {logs.length > 0 ? (
        logs.map((log, index) => (
          <div
            key={index}
            className="console-log__entry"
            style={{ color: logColors[index] || "inherit" }} // Apply color if provided
          >
            {log}
          </div>
        ))
      ) : (
        <div className="console-log__entry">No logs available</div>
      )}
    </div>
  );
}

export default ConsoleLogComponent;
