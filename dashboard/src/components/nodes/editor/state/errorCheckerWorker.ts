// Import any necessary dependencies here
import { type NodeDefAny } from "event-processing";
import { checkErrors } from "../../../../shared/publish";

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  // Receive data from the main thread
  const nodeDefs = event.data;

  // Perform the error checking
  const errors = checkErrors(nodeDefs as NodeDefAny[]);

  // Send the result back to the main thread
  self.postMessage(errors);
});
