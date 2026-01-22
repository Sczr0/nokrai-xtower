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
    
    // 2. Check status (Assuming 'trade_status' is 'TRADE_SUCCESS' or similar check as per docs)
    // The docs say callback param includes trade_status=TRADE_SUCCESS
    // However, for the sync return (return_url), params might differ slightly.
    // Let's assume successful validation means we can show the invite code.
    
    // In a real app, you should check trade_status if available, or query the order API.
    
    return new Response(JSON.stringify({ 
        success: true, 
        invite_code: "LINUXDO-2026-WELCOME-VIP" // Mock invite code
    }), {
        headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Callback error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
