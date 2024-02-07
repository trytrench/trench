import { compileTs } from "event-processing/src/function-type-defs/types/Computed";

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  // Receive data from the main thread
  const inputs = event.data;

  const output = compileTs(
    inputs as {
      code: string;
      typeDefs: string;
    }
  );

  console.log(output);

  // Send the result back to the main thread
  self.postMessage(output);
});
