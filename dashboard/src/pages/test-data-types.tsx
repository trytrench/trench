"use client";
import { api } from "../utils/api";
import {
  TSchema,
  TypeName,
  createDataType,
  getNamedTS,
} from "event-processing/src/data-types";
import { useMemo, useState } from "react";
import { IndentationText, Project } from "ts-morph";
import { SchemaBuilder } from "../components/SchemaBuilder";
import { SchemaTag } from "../components/SchemaTag";
import { SelectDataPath } from "../components/nodes/SelectDataPath";
import { DataPath } from "event-processing";

interface Argument {
  name: string;
  type: TSchema;
}

interface Count {
  count: Argument[];
  countBy: Argument[];
  timeWindow: {
    amount: number;
    unit: string;
  };
}

function ShowSchema({ schema }: { schema: TSchema }) {
  // format using ts-morph
  const formatted = useMemo(() => {
    const ts = getNamedTS(schema);
    try {
      const project = new Project({
        useInMemoryFileSystem: true,
        manipulationSettings: {
          indentationText: IndentationText.FourSpaces,
        },
      });
      const file = project.createSourceFile(
        "test.ts",
        ts.replace(/{/g, "{\n").replace(/;/g, ";\n")
      );
      file.formatText({
        indentMultiLineObjectLiteralBeginningOnBlankLine: true,
      });

      return file.getFullText();
    } catch (e) {
      console.error(e);
      return ts;
    }
  }, [schema]);
  return (
    <div className="p-4 border shadow">
      <div className="font-bold">Schema</div>
      <pre className="text-gray-800">{JSON.stringify(schema, null, 2)}</pre>
      <div className="h-8"></div>
      <div className="font-bold">Type tag</div>
      <SchemaTag schema={schema} />
      <div className="h-8"></div>
      <div className="font-bold">TypeScript</div>
      <pre className="text-blue-500">{formatted}</pre>
    </div>
  );
}

export default function Page() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const [schema, setSchema] = useState<TSchema>({
    type: TypeName.Any,
  });

  const [dataPath, setDataPath] = useState<DataPath | null>(null);
  return (
    <div className="text-sm p-4 flex flex-col items-start gap-4">
      {/* <ShowSchema schema={cardEntity.schema} />
      <ShowSchema schema={location.schema} /> */}
      <SchemaBuilder value={schema} onChange={setSchema} />
      <ShowSchema schema={schema} />

      <div className="h-8"></div>
      <div className="text-white"></div>
      {/* <SelectDataPath
        eventType="C87WLwulYjPBV3eNPvykj"
        value={dataPath}
        onChange={setDataPath}
        desiredSchema={{ type: TypeName.Location }}
      /> */}
    </div>
  );
}
