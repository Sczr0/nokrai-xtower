// 页面文案集中管理，便于后续维护与扩展
import { siteConfig } from "../config";

export const navLinks = [
  { label: "查询订单", href: "/callback" },
  { label: "联系客服", href: siteConfig.authorUrl }
];

const priceInt = parseInt(siteConfig.price);

export const hero = {
  title: siteConfig.heroTitle,
  subtitle: siteConfig.heroSubtitle,
  cta: {
    label: `立即购买 (${priceInt} ${siteConfig.currencyLabel})`,
    href: "#buy"
  }
};

export const features = [
  {
    icon: "bolt",
    title: "秒级发货",
    description: "支付成功后，系统自动显示邀请码"
  },
  {
    icon: "shield",
    title: "官方积分",
    description: "支持 LinuxDo Connect 登录与积分支付"
  },
  {
    icon: "scale",
    title: "争议保障",
    description: "支持服务方与消费方争议处理，保障交易权益"
  }
];

export const steps = [
  "点击购买，跳转 LinuxDo 授权。",
  `确认支付 ${priceInt} ${siteConfig.currencyLabel}。`,
  "页面自动跳转回并显示邀请码。"
];

export const footer = {
  text: `© 2026 ${siteConfig.productName}`,
  privacy: { label: "隐私协议", href: "/privacy" }
};
