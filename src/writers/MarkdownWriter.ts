import fs from "fs";
import path from "path";
import { IClassDoc, INamespace, IPropertyDoc } from "../structures";
import { MermaidErdWriter } from "./MermaidErdWriter";

export class MarkdownWriter {
  private static lines: string[] = [];

  public static render(
    title: string = "ERD",
    outFilePath: string = "docs/ERD.md",
    namespaces: INamespace[]
  ) {
    this.lines = [];

    this.writeHeader(title);
    this.writeTOC(namespaces);
    this.writeBodyContent(namespaces);

    const directory = path.dirname(outFilePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(outFilePath, this.lines.join("\n"));
  }

  private static writeHeader(title: string): void {
    this.lines.push(`# ${title}\n`);
    this.lines.push(
      "> Generated by [`typeorm-markdown-generator`](https://github.com/hermin9804/typeorm-markdown-generator)\n"
    );
    this.lines.push("\n");
  }

  private static writeTOC(namespaces: INamespace[]): void {
    this.lines.push("## Table of Contents\n");
    this.lines.push("\n");

    namespaces.forEach((namespace) => {
      this.lines.push(
        `- [${
          namespace.namespaceName
        }](#${namespace.namespaceName.toLowerCase()})`
      );
    });

    this.lines.push("\n");
  }

  private static writeBodyContent(namespaces: INamespace[]): void {
    namespaces.forEach((namespace) => {
      this.lines.push(`## ${namespace.namespaceName}\n`);
      this.writeMermaidErd(namespace);
      namespace.classDocs.forEach((doc) => {
        this.writeDocumentContent(doc);
      });
    });
  }

  private static writeMermaidErd(namespace: INamespace): void {
    const erdDiagram = MermaidErdWriter.render(namespace.tables);
    this.lines.push("```mermaid\n" + erdDiagram + "\n```\n");
  }

  private static writeDocumentContent(doc: IClassDoc): void {
    this.lines.push(`### ${doc.className}\n`);
    this.lines.push(`${doc.docs.join(" ")}\n`);
    this.lines.push("**Properties**\n");

    doc.properties.forEach((prop: IPropertyDoc) => {
      this.lines.push(`  - \`${prop.propertyName}\`: ${prop.docs.join(" ")}`);
    });

    this.lines.push("\n");
  }
}
