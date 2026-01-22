import crypto from 'node:crypto';

export const POST = async ({ request }) => {
  try {
    // 1. Get configuration
    const pid = import.meta.env.LINUX_DO_CLIENT_ID;
    const key = import.meta.env.LINUX_DO_CLIENT_SECRET;
    
    if (!pid || !key) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), { status: 500 });
    }

    // 2. Prepare order data
    const out_trade_no = "ORDER_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const name = "LinuxDo 邀请码";
    const money = "50.00"; 
    const type = "epay";

    // 3. Generate signature
    const return_url = new URL(request.url).origin + "/callback";
    
    const params = {
      pid,
      type,
      out_trade_no,
      name,
      money,
      return_url
    };
    
    // Filter empty and sort
    const keys = Object.keys(params).filter(k => params[k]).sort();
    const paramStr = keys.map(k => `${k}=${params[k]}`).join('&');
    
    // Sign
    const signStr = paramStr + key;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    // 4. Return signed data
    return new Response(JSON.stringify({
      action: "https://credit.linux.do/epay/pay/submit.php",
      params: {
        ...params,
        sign,
        sign_type: "MD5"
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
