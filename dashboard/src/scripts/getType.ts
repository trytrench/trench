import {
  Project,
  type Type,
  Node,
  TypeFormatFlags,
  type TypeAliasDeclaration,
  type SourceFile,
} from "ts-morph";

const typeName = "RulePayload";
const typeFile = "src/server/transforms/output.ts";
const outputFile = "rulePayloadType.ts";

const project = new Project();

function findType(typeName: string, sourceFile: SourceFile) {
  // Look for a type alias with the given name
  const typeAlias = sourceFile.getTypeAlias(typeName);
  if (typeAlias) {
    return typeAlias;
  }

  // Look for an interface with the given name
  const interfaceDeclaration = sourceFile.getInterface(typeName);
  if (interfaceDeclaration) {
    return interfaceDeclaration;
  }

  // Look for a class with the given name
  const classDeclaration = sourceFile.getClass(typeName);
  if (classDeclaration) {
    return classDeclaration;
  }

  // Look for an enum with the given name
  const enumDeclaration = sourceFile.getEnum(typeName);
  if (enumDeclaration) {
    return enumDeclaration;
  }

  throw new Error(`Could not find type ${typeName}`);
}

type TypeDeclaration = ReturnType<typeof findType>;

function findTypeInProject(typeName: string) {
  // console.log("Searching for type", typeName);
  const hits = project.getSourceFiles().flatMap((sourceFile) => {
    try {
      const type = findType(typeName, sourceFile);
      if (sourceFile.getFilePath().includes(outputFile)) return [];
      // console.log(`Found type ${typeName} in ${sourceFile.getFilePath()}`);
      return [type];
    } catch {
      return [];
    }
  });

  if (hits.length === 0) {
    throw new Error(`Could not find type ${typeName}`);
  }
  return hits[0];
}

const sourceFile = project.addSourceFileAtPath(typeFile);
project.addSourceFilesAtPaths("node_modules/.prisma/client/**/*.ts");
project.addSourceFilesAtPaths("src/server/transforms/**/*.ts");

console.log(project.getSourceFiles().map((f) => f.getFilePath()));

const rulePayloadType = findType(typeName, sourceFile);
const newFile = project.createSourceFile(outputFile, {}, { overwrite: true });

const processedTypes: Map<string, boolean> = new Map();

// console.log(project.getSourceFiles().map((f) => f.getFilePath()));

function traverseType(type: Type) {
  const aliasSymbol = type.getAliasSymbol();
  if (aliasSymbol) {
    const name = aliasSymbol.getName();
    const type = findTypeInProject(name);
    if (!type) return;
    processTypeDecl(type);
  }

  type.getProperties().forEach((property) => {
    try {
      const propertyType = project
        .getTypeChecker()
        .getTypeOfSymbolAtLocation(
          property,
          property.getValueDeclarationOrThrow()
        );
      traverseType(propertyType);
    } catch {
      const propertyType = project
        .getTypeChecker()
        .getDeclaredTypeOfSymbol(property);
      traverseType(propertyType);
    }
  });
  type.getIntersectionTypes().forEach((intersectionType) => {
    traverseType(intersectionType);
  });
  type.getUnionTypes().forEach((unionType) => {
    traverseType(unionType);
  });
  // type.getBaseTypes().forEach((baseType) => {
  //   traverseType(baseType);
  // });
  // type.getCallSignatures().forEach((callSignature) => {
  //   traverseType(callSignature.getReturnType());
  // });
  // type.getConstructSignatures().forEach((constructSignature) => {
  //   traverseType(constructSignature.getReturnType());
  // });
  // type
  //   .getConstraint()
  //   ?.getConstraint()
  //   ?.getProperties()
  //   .forEach((property) => {
  //     const propertyType = project
  //       .getTypeChecker()
  //       .getTypeOfSymbolAtLocation(
  //         property,
  //         property.getValueDeclarationOrThrow()
  //       );
  //     traverseType(propertyType);
  //   });
}

function processTypeDecl(typeDecl: TypeDeclaration) {
  const typeName = typeDecl.getSymbol()?.getName();
  const type = typeDecl.getType();

  const symbol = type.getSymbol();
  if (!symbol) return;
  if (!typeName) return;

  if (processedTypes.has(typeName)) return;
  // Do not process built-in types.
  if (
    symbol
      .getDeclarations()
      .some((declaration) =>
        declaration.getSourceFile().getFilePath().includes("typescript/lib")
      )
  ) {
    return;
  }

  processedTypes.set(typeName, true);

  const typeText = project
    .getTypeChecker()
    .getTypeText(type, undefined, TypeFormatFlags.NoTruncation);
  if (typeText === typeName) {
    const structure = typeDecl.getStructure();
    newFile.insertTypeAliases(0, [structure]);
  } else {
    newFile.addTypeAlias({
      name: typeName,
      isExported: true,
      type: typeText,
    });
  }

  typeDecl.forEachDescendantAsArray().forEach((node) => {
    console.log(node.getKindName());
  });

  // traverseType(type);
}

processTypeDecl(rulePayloadType);

project.saveSync();
