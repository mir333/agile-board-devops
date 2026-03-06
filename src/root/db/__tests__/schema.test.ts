import { describe, expect, it } from "vitest";
import { userSettingsSchema } from "../schema";

describe("UserSettings schema", () => {
  it("includes azureDevOpsOrg property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsOrg");
    expect(userSettingsSchema.properties.azureDevOpsOrg.type).toBe("string");
  });

  it("includes azureDevOpsPat property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsPat");
    expect(userSettingsSchema.properties.azureDevOpsPat.type).toBe("string");
  });

  it("includes azureDevOpsQueryId property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsQueryId");
    expect(userSettingsSchema.properties.azureDevOpsQueryId.type).toBe("string");
  });

  it("includes azureDevOpsQueryName property", () => {
    expect(userSettingsSchema.properties).toHaveProperty("azureDevOpsQueryName");
    expect(userSettingsSchema.properties.azureDevOpsQueryName.type).toBe("string");
  });

  it("has schema version 2", () => {
    expect(userSettingsSchema.version).toBe(2);
  });
});
