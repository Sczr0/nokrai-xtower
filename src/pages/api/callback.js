import crypto from 'node:crypto';

export const GET = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const accept = request.headers.get("accept") || "";
    const isBrowser = accept.includes("text/html");
    const runtimeKey = locals.runtime?.env?.LINUX_DO_CLIENT_SECRET;
    const buildKey = import.meta.env.LINUX_DO_CLIENT_SECRET;
    const key = runtimeKey != null ? String(runtimeKey) : buildKey;

    const runtimePid = locals.runtime?.env?.LINUX_DO_CLIENT_ID;
    const buildPid = import.meta.env.LINUX_DO_CLIENT_ID;
    const pid = runtimePid != null ? String(runtimePid) : buildPid;

    if (!key || !pid) {
        return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    // 1. Verify Signature
    const sign = params.sign;
    const signType = params.sign_type;
    
    if (!sign || !signType) {
       const outTradeNo = (params.out_trade_no || "").trim();
       if (outTradeNo) {
          return Response.redirect(`${url.origin}/callback?out_trade_no=${encodeURIComponent(outTradeNo)}`, 302);
       }
       return new Response("fail", { status: 400 });
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
        const outTradeNo = (params.out_trade_no || "").trim();
        if (isBrowser && outTradeNo) {
            return Response.redirect(`${url.origin}/callback?out_trade_no=${encodeURIComponent(outTradeNo)}`, 302);
        }
        return new Response("fail", { status: 400 });
    }
    
    const tradeStatus = params.trade_status;
    if (tradeStatus && tradeStatus !== "TRADE_SUCCESS") {
        const outTradeNo = (params.out_trade_no || "").trim();
        if (isBrowser && outTradeNo) {
            return Response.redirect(`${url.origin}/callback?out_trade_no=${encodeURIComponent(outTradeNo)}`, 302);
        }
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
                } else {
                    console.log(`Inventory shortage for order ${outTradeNo}, initiating refund...`);
                    // Refund logic
                    if (params.trade_no && params.money) {
                        try {
                             const refundRes = await fetch("https://credit.linux.do/epay/api.php", {
                                 method: "POST",
                                 headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                 body: new URLSearchParams({
                                     pid: pid,
                                     key: key,
                                     trade_no: params.trade_no,
                                     money: params.money,
                                     out_trade_no: outTradeNo
                                 })
                             });
                             const refundData = await refundRes.json();
                             console.log("Refund result:", refundData);
                        } catch (err) {
                             console.error("Refund failed:", err);
                        }
                    } else {
                        console.error("Cannot refund: Missing trade_no or money in params");
                    }
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
