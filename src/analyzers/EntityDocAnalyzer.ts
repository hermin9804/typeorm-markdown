import { ClassDeclaration, Project, PropertyDeclaration, ts } from "ts-morph";
import { IClassDoc } from "../structures";

const TAGS = {
  namespace: "namespace",
  erd: "erd",
  describe: "describe",
  hidden: "hidden",
  minitems: "minitems",
};

export class EntityDocAnalyzer {
  public static async analyze(sourceFilePath: string): Promise<IClassDoc[]> {
    const result: IClassDoc[] = [];
    const project = await this.loadProject(sourceFilePath);
    const sourceFiles = project.getSourceFiles();
    sourceFiles.forEach((sourceFile) => {
      sourceFile.getClasses().forEach((cls) => {
        result.push(this.createClassDoc(cls));
      });
    });
    return result;
  }

  private static async loadProject(sourceFilePath: string): Promise<Project> {
    const project = new Project();
    project.addSourceFilesAtPaths(sourceFilePath);
    if (project.getSourceFiles().length === 0) {
      throw new Error(
        "No source files found, please check the typeorm-markdwon config entityPath"
      );
    }
    return project;
  }

  private static createClassDoc(cls: ClassDeclaration): IClassDoc {
    const ret = {
      className: this.extractEntityName(cls),
      docs: cls
        .getJsDocs()
        .flatMap((doc) => this.splitByNewLine(doc.getInnerText().trim())),
      namespaceTags: this.extractNamespaces(cls),
      erdTags: this.extractErdTags(cls),
      describeTags: this.extractDiscribeTags(cls),
      hasHiddenTag: this.hasHiddenTag(cls),
      properties: cls.getProperties().map((prop) => ({
        propertyName: prop.getName(),
        docs: prop
          .getJsDocs()
          .flatMap((doc) => this.splitByNewLine(doc.getInnerText().trim())),
        hasMinitemsTag: this.hasMinitemsTag(prop),
      })),
    };
    // namespqceTags, erdTags, describeTags, hasHiddenTag 가 하나라도 없으면 Default namespace 추가
    if (
      ret.namespaceTags.length === 0 &&
      ret.erdTags.length === 0 &&
      ret.describeTags.length === 0 &&
      !ret.hasHiddenTag
    ) {
      ret.namespaceTags.push("Default");
    }
    return ret;
  }

  private static splitByNewLine(text: string): string[] {
    return text.split(/\r?\n/);
  }

  private static extractEntityName(cls: ClassDeclaration): string {
    return (
      this.extractEntityDecoratorNameParameter(cls) ??
      this.extractClassName(cls)
    );
  }

  /**
   * '@Entity("user")'에서 entity name을 추출하는 함수
   */
  private static extractEntityDecoratorNameParameter(
    cls: ClassDeclaration
  ): string | null {
    const entityDecorator = cls.getDecorator("Entity");
    if (!entityDecorator) return null;
    const args = entityDecorator.getArguments();
    if (args.length > 0 && args[0].getKind() === ts.SyntaxKind.StringLiteral) {
      return args[0].getText().slice(1, -1); // 문자열 리터럴에서 따옴표 제거
    }
    return null;
  }

  private static extractClassName(cls: ClassDeclaration): string {
    const className = cls.getName();
    if (!className) throw new Error("Entity class must have a name.");
    return this.transformToSnakeCase(className);
  }

  private static transformToSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .substring(1);
  }

  private static extractNamespaces(cls: ClassDeclaration): string[] {
    const result: string[] = [];
    cls.getJsDocs().forEach((doc) => {
      doc.getTags().forEach((tag) => {
        if (tag.getTagName() === TAGS.namespace) {
          result.push(tag.getCommentText() ?? "");
        }
      });
    });
    return result;
  }

  private static extractErdTags(cls: ClassDeclaration): string[] {
    const result: string[] = [];
    cls.getJsDocs().forEach((doc) => {
      doc.getTags().forEach((tag) => {
        if (tag.getTagName() === TAGS.erd) {
          result.push(tag.getCommentText() ?? "");
        }
      });
    });
    return result;
  }

  private static extractDiscribeTags(cls: ClassDeclaration): string[] {
    const result: string[] = [];
    cls.getJsDocs().forEach((doc) => {
      doc.getTags().forEach((tag) => {
        if (tag.getTagName() === TAGS.describe) {
          result.push(tag.getCommentText() ?? "");
        }
      });
    });
    return result;
  }

  private static hasHiddenTag(cls: ClassDeclaration): boolean {
    const hasHiddenTag = cls
      .getJsDocs()
      .some((doc) =>
        doc.getTags().some((tag) => tag.getTagName() === TAGS.hidden)
      );
    return hasHiddenTag;
  }

  private static hasMinitemsTag(prop: PropertyDeclaration): boolean {
    const hasMinitemsTag = prop
      .getJsDocs()
      .some((doc) =>
        doc.getTags().some((tag) => tag.getTagName() === TAGS.minitems)
      );
    return hasMinitemsTag;
  }
}
