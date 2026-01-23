import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 构建产物冒烟测试
describe("build output", () => {
  it("dist/index.html 存在", () => {
    const distPath = resolve("dist/_worker.js/index.js");
    expect(existsSync(distPath)).toBe(true);
  });
});
