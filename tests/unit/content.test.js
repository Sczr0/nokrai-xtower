import { describe, it, expect } from "vitest";
import { navLinks, hero, features, steps, footer } from "../../src/data/content.js";

// 内容数据单元测试
describe("content data", () => {
  it("包含必要的导航链接", () => {
    expect(navLinks.length).toBeGreaterThanOrEqual(2);
    expect(navLinks.map((link) => link.label)).toContain("查询订单");
  });

  it("Hero 文案完整", () => {
    expect(hero.title).toContain("邀请码");
    expect(hero.cta.label).toContain("500 积分");
  });

  it("特性与步骤数量正确", () => {
    expect(features).toHaveLength(3);
    expect(steps).toHaveLength(3);
  });

  it("页脚信息存在", () => {
    expect(footer.text).toContain("LinuxDo");
  });
});
