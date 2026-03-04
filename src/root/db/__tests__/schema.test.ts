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
});
