import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 页面关键文案功能测试
describe("page content", () => {
  it("包含关键标题与按钮文案", () => {
    const distPath = resolve("dist/index.html");
    const html = readFileSync(distPath, "utf-8");
    expect(html).toContain("LinuxDo 社区邀请码自动发货");
    expect(html).toContain("立即购买 (50 积分)");
    expect(html).toContain("购买流程");
  });
});
