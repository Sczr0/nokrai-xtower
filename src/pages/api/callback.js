import crypto from 'node:crypto';

export const GET = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const runtimeKey = locals.runtime?.env?.LINUX_DO_CLIENT_SECRET;
    const buildKey = import.meta.env.LINUX_DO_CLIENT_SECRET;
    const key = runtimeKey != null ? String(runtimeKey) : buildKey;

    if (!key) {
        return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    // 1. Verify Signature
    const sign = params.sign;
    const signType = params.sign_type;
    
    if (!sign || !signType) {
       return new Response(JSON.stringify({ success: false, message: "No signature provided" }), { status: 400 });
    }

    // Filter sign and sign_type, then sort and join
    const verifyParams = { ...params };
    delete verifyParams.sign;
    delete verifyParams.signType; // In case it was passed differently, though usually sign_type
    delete verifyParams.sign_type;

    const keys = Object.keys(verifyParams).filter(k => verifyParams[k] !== '' && verifyParams[k] !== undefined).sort();
    const paramStr = keys.map(k => `${k}=${verifyParams[k]}`).join('&');
    
    const signStr = paramStr + key;
    const calculatedSign = crypto.createHash('md5').update(signStr).digest('hex');

    if (calculatedSign !== sign) {
        return new Response(JSON.stringify({ success: false, message: "Invalid signature" }), { status: 400 });
    }
    
    const tradeStatus = params.trade_status;
    if (tradeStatus && tradeStatus !== "TRADE_SUCCESS") {
        return new Response("fail", { status: 400 });
    }

    const DB = locals.runtime?.env?.DB;
    if (DB) {
        const outTradeNo = (params.out_trade_no || "").trim();
        if (outTradeNo) {
            const reserved = await DB.prepare("SELECT * FROM invite_codes WHERE trade_no = ?").bind(outTradeNo).first();
            if (reserved) {
                await DB.prepare("UPDATE invite_codes SET status = 'used', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(reserved.id).run();
            } else {
                const fallback = await DB.prepare("SELECT * FROM invite_codes WHERE status = 'unused' LIMIT 1").first();
                if (fallback) {
                    await DB.prepare("UPDATE invite_codes SET status = 'used', updated_at = CURRENT_TIMESTAMP, trade_no = ? WHERE id = ?").bind(outTradeNo, fallback.id).run();
                }
            }
        }
    }

    return new Response("success", {
        headers: { "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error("Callback error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
