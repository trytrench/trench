// Imports
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { Resource } from "@opentelemetry/resources";

// Configure the trace provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "example application",
  }),
});

// Configure how spans are processed and exported. In this case we're sending spans
// as we receive them to an OTLP-compatible collector (e.g. Jaeger).
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));

// Register your auto-instrumentors
registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [new PrismaInstrumentation()],
});

// Register the provider globally
provider.register();
