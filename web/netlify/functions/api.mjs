export default async function handler(request) {
  const GAS_URL = process.env.GAS_WEB_APP_URL;
  const API_SECRET = process.env.APPS_SCRIPT_API_SECRET;

  if (!GAS_URL) {
    return json({
      success: false,
      errorCode: "CONFIG_ERROR",
      message: "GAS_WEB_APP_URL is not configured.",
    }, 500);
  }

  if (!API_SECRET) {
    return json({
      success: false,
      errorCode: "CONFIG_ERROR",
      message: "APPS_SCRIPT_API_SECRET is not configured.",
    }, 500);
  }

  try {
    let payload;

    if (request.method === "GET") {
      const url = new URL(request.url);
      payload = {
        action: url.searchParams.get("action") || "health",
      };
    } else {
      payload = await request.json();
    }

    payload.apiSecret = API_SECRET;

    const gasResponse = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await gasResponse.text();

    return new Response(text, {
      status: gasResponse.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return json({
      success: false,
      errorCode: "NETLIFY_PROXY_ERROR",
      message: error instanceof Error ? error.message : "Proxy request failed.",
    }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  path: "/api",
};
