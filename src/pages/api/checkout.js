import crypto from 'node:crypto';

export const POST = async ({ request, locals }) => {
  try {
    // 1. Get configuration
    const runtimePid = locals.runtime?.env?.LINUX_DO_CLIENT_ID;
    const runtimeKey = locals.runtime?.env?.LINUX_DO_CLIENT_SECRET;
    const buildPid = import.meta.env.LINUX_DO_CLIENT_ID;
    const buildKey = import.meta.env.LINUX_DO_CLIENT_SECRET;
    const pid = (runtimePid != null ? String(runtimePid) : (buildPid || "")).trim();
    const key = (runtimeKey != null ? String(runtimeKey) : (buildKey || "")).trim();
    
    if (!pid || !key) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), { status: 500 });
    }

    // 2. Prepare order data
    // Use lowercase and simpler format to avoid case sensitivity issues
    const out_trade_no = "order_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const name = "LinuxDo 邀请码";
    const money = "50.00"; 
    const type = "epay";

    // 0. Check inventory and Reserve
    const DB = locals.runtime?.env?.DB;
    if (DB) {
        await DB.prepare("UPDATE invite_codes SET status = 'unused', trade_no = NULL WHERE status = 'reserved' AND updated_at < datetime('now', '-30 minutes')").run();

        // Try to reserve a code
        const { meta } = await DB.prepare(`
            UPDATE invite_codes 
            SET status = 'reserved', updated_at = CURRENT_TIMESTAMP, trade_no = ? 
            WHERE id = (SELECT id FROM invite_codes WHERE status = 'unused' ORDER BY id LIMIT 1)
              AND status = 'unused'
        `).bind(out_trade_no).run();

        if (meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Inventory shortage: No invite codes available." }), { status: 400 });
        }
    } else {
        console.warn("Skipping inventory check: DB not available");
    }

    // 3. Generate signature

    // 3. Generate signature
    const return_url = new URL(request.url).origin + "/callback";
    
    const notify_url = new URL(request.url).origin + "/api/callback";
    const params = {
      pid,
      type,
      out_trade_no,
      name,
      money,
      notify_url,
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
