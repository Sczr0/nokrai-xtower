import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// 页面关键文案功能测试
describe("page content", () => {
  it("包含关键标题与按钮文案", () => {
    const contentChunksDir = resolve("dist/_worker.js/chunks");
    const contentChunk = readdirSync(contentChunksDir).find(
      (name) => name.startsWith("content_") && name.endsWith(".mjs")
    );

    expect(contentChunk).toBeTruthy();

    const contentJs = readFileSync(resolve(contentChunksDir, contentChunk), "utf-8");
    expect(contentJs).toContain("LinuxDo 社区邀请码自动发货");
    expect(contentJs).toContain("立即购买 (500 积分)");

    const indexModule = readFileSync(resolve("dist/_worker.js/pages/index.astro.mjs"), "utf-8");
    expect(indexModule).toContain("购买流程");
  });
});
