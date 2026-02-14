import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const OVH_API_URL = 'https://eu.api.ovh.com/1.0';

function buildSignature(
  appSecret: string,
  consumerKey: string,
  method: string,
  url: string,
  body: string,
  timestamp: number
): string {
  const toSign = [appSecret, consumerKey, method, url, body, String(timestamp)].join('+');
  // Use Web Crypto API for SHA-1
  return '';
}

async function sha1Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ovhSign(
  appSecret: string,
  consumerKey: string,
  method: string,
  url: string,
  body: string,
  timestamp: number
): Promise<string> {
  const toSign = [appSecret, consumerKey, method, url, body, String(timestamp)].join('+');
  const hash = await sha1Hex(toSign);
  return '$1$' + hash;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appKey = Deno.env.get('OVH_APP_KEY');
    const appSecret = Deno.env.get('OVH_APP_SECRET');
    const consumerKey = Deno.env.get('OVH_CONSUMER_KEY');
    const serviceName = Deno.env.get('OVH_SMS_SERVICE_NAME');

    if (!appKey || !appSecret || !consumerKey || !serviceName) {
      throw new Error('OVH SMS credentials not configured');
    }

    const { receivers, message, sender } = await req.json();

    if (!receivers || !Array.isArray(receivers) || receivers.length === 0) {
      throw new Error('receivers array is required');
    }
    if (!message || typeof message !== 'string') {
      throw new Error('message string is required');
    }

    // Format phone numbers to international format
    const formattedReceivers = receivers.map((phone: string) => {
      let cleaned = phone.replace(/[\s\.\-\(\)]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '+33' + cleaned.substring(1);
      }
      if (!cleaned.startsWith('+')) {
        cleaned = '+33' + cleaned;
      }
      return cleaned;
    });

    // Get OVH server time for signature
    const timeRes = await fetch(`${OVH_API_URL}/auth/time`);
    const timestamp = await timeRes.json();

    // Build SMS request
    const smsUrl = `${OVH_API_URL}/sms/${serviceName}/jobs`;
    const smsBody = JSON.stringify({
      charset: 'UTF-8',
      class: 'phoneDisplay',
      coding: '7bit',
      message: message,
      noStopClause: true,
      priority: 'high',
      receivers: formattedReceivers,
      senderForResponse: false,
      validityPeriod: 2880,
      ...(sender ? { sender } : {}),
    });

    const signature = await ovhSign(appSecret, consumerKey, 'POST', smsUrl, smsBody, timestamp);

    const smsRes = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': appKey,
        'X-Ovh-Timestamp': String(timestamp),
        'X-Ovh-Signature': signature,
        'X-Ovh-Consumer': consumerKey,
      },
      body: smsBody,
    });

    const result = await smsRes.json();

    if (!smsRes.ok) {
      console.error('OVH SMS API error:', JSON.stringify(result));
      throw new Error(`OVH API error [${smsRes.status}]: ${JSON.stringify(result)}`);
    }

    console.log('SMS sent successfully:', JSON.stringify(result));

    return new Response(JSON.stringify({
      success: true,
      totalCreditsRemoved: result.totalCreditsRemoved,
      validReceivers: result.validReceivers,
      invalidReceivers: result.invalidReceivers,
      ids: result.ids,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('SMS sending error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
