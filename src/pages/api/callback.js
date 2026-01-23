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

    const requestRefund = async ({ outTradeNo, tradeNo, money }) => {
        if (!outTradeNo) return { ok: false, msg: "missing out_trade_no" };

        let resolvedTradeNo = tradeNo ? String(tradeNo).trim() : "";
        let resolvedMoney = money ? String(money).trim() : "";
        let resolvedStatus = null;

        try {
            if (!resolvedTradeNo || !resolvedMoney) {
                const queryUrl = `https://credit.linux.do/epay/api.php?act=order&pid=${encodeURIComponent(pid)}&key=${encodeURIComponent(key)}&out_trade_no=${encodeURIComponent(outTradeNo)}`;
                const queryRes = await fetch(queryUrl, { method: "GET" });
                const queryData = await queryRes.json();

                if (queryData?.code === 1) {
                    resolvedTradeNo = String(queryData.trade_no || "").trim();
                    resolvedMoney = String(queryData.money || "").trim();
                    resolvedStatus = queryData.status;
                } else {
                    return { ok: false, msg: queryData?.msg || "order query failed" };
                }
            }

            if (resolvedStatus !== null && String(resolvedStatus) !== "1") {
                return { ok: false, msg: "order not paid" };
            }

            if (!resolvedTradeNo || !resolvedMoney) {
                return { ok: false, msg: "incomplete order info" };
            }

            const doRefund = async (tradeNoToUse) => {
                const refundRes = await fetch("https://credit.linux.do/epay/api.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        act: "refund",
                        pid: pid,
                        key: key,
                        trade_no: tradeNoToUse,
                        money: resolvedMoney,
                        out_trade_no: outTradeNo
                    })
                });

                const ct = refundRes.headers.get("content-type") || "";
                const refundData = ct.includes("application/json") ? await refundRes.json() : { raw: await refundRes.text() };
                if (refundData?.code === 1) return { ok: true, msg: refundData?.msg || "refund ok", data: refundData };
                return { ok: false, msg: refundData?.msg || refundData?.raw || "refund failed", data: refundData };
            };

            let result = await doRefund(resolvedTradeNo);
            if (!result.ok && resolvedTradeNo !== outTradeNo) {
                const retry = await doRefund(outTradeNo);
                if (retry.ok) result = retry;
            }

            return result;
        } catch (err) {
            return { ok: false, msg: err?.message || "refund error" };
        }
    };

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
                    const refundResult = await requestRefund({
                        outTradeNo,
                        tradeNo: params.trade_no,
                        money: params.money
                    });
                    if (refundResult.ok) {
                        console.log("Refund result:", refundResult.data || refundResult.msg);
                    } else {
                        console.error("Refund failed:", refundResult.msg, refundResult.data || "");
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
