/**
 * Cloudflare Worker - Gemini API 프록시
 * 
 * 프론트엔드에서 받은 이미지 분석 요청을 Gemini API로 전달하고,
 * API 키를 서버 사이드에서 안전하게 관리합니다.
 */

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

interface GeminiRequestBody {
  contents: Array<{
    parts: Array<
      | { text: string }
      | {
          inlineData: {
            data: string;
            mimeType: string;
          };
        }
    >;
  }>;
  generationConfig: {
    responseMimeType: string;
    responseJsonSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

async function callGemini(
  env: Env,
  requestBody: GeminiRequestBody
): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${env.GEMINI_API_KEY}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

const AGRICULTURAL_MACHINERY = [
  "동력경운기", "트랙터", "콤바인", "승용관리기", "승용이앙기",
  "SS 분무기", "광역방제기", "베일러(결속기)", "농용굴삭기",
  "농용로우더", "농용동력운반차", "항공방제기", "지자체 소유 임대농기계"
];

function getCorsHeaders(_request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    // Preflight 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok", service: "machinery-api-proxy" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST만 허용
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "API 설정이 없습니다. GEMINI_API_KEY를 설정하세요.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const body = await request.json() as { images: { base64: string; mimeType: string }[] };
      
      if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
        return new Response(
          JSON.stringify({ error: "최소 1장의 이미지가 필요합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.images.length > 3) {
        return new Response(
          JSON.stringify({ error: "최대 3장까지 업로드 가능합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Gemini API 요청 구성
      const prompt = `
        당신은 농기계 보험 심사를 위한 전문가입니다.
        농업인이 촬영한 ${body.images.length}장의 농기계 사진이 제공됩니다.
        
        사진은 특정 각도를 지정하지 않고 자유롭게 촬영된 것이므로,
        먼저 각 사진이 어떤 각도(정면, 후면, 좌측, 우측, 상단, 세부 등)에서 
        촬영되었는지 자동으로 판별해주세요.
        
        그 다음, 모든 사진을 종합적으로 분석하여 해당 농기계가 
        다음 목록 중 어느 것에 해당되는지 판독해주세요:
        
        목록: ${AGRICULTURAL_MACHINERY.join(", ")}

        만약 목록에 없는 장비이거나 판독이 불가능한 경우 "기타/확인불가"로 분류해주세요.
        
        각 사진에서 관찰한 내용을 개별적으로 기술하고,
        이를 종합하여 최종 판정을 내려주세요.
        사진이 여러 장일 경우 교차 검증하여 더 정확한 결과를 도출하세요.
        
        결과는 반드시 다음 JSON 형식으로 응답해주세요:
        {
          "machineryType": "장비명",
          "confidence": 0.0~1.0 사이의 확신도,
          "reason": "해당 장비로 판단한 종합적인 주요 이유 (한국어, 모든 사진의 정보를 종합)",
          "features": ["사진들에서 관찰된 주요 특징 1", "특징 2", ...],
          "angleAnalysis": [
            { 
              "photoNumber": 1, 
              "detectedAngle": "AI가 판별한 촬영 각도", 
              "observations": "해당 사진에서 관찰된 세부 내용" 
            }
          ]
        }
      `;

      const imageParts = body.images.map(img => ({
        inlineData: {
          data: img.base64.includes(",") ? img.base64.split(",")[1] : img.base64,
          mimeType: img.mimeType,
        },
      }));

      const geminiRequestBody: GeminiRequestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              machineryType: { type: "string" },
              confidence: { type: "number" },
              reason: { type: "string" },
              features: { type: "array", items: { type: "string" } },
              angleAnalysis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    photoNumber: { type: "integer" },
                    detectedAngle: { type: "string" },
                    observations: { type: "string" },
                  },
                  required: ["photoNumber", "detectedAngle", "observations"],
                },
              },
            },
            required: ["machineryType", "confidence", "reason", "features", "angleAnalysis"],
          },
        },
      };

      const geminiResponse = await callGemini(env, geminiRequestBody);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API Error:", errorText);

        let detailedMessage = `Gemini API 오류: ${geminiResponse.status}`;
        try {
          const parsed = JSON.parse(errorText) as { error?: { message?: string } };
          if (parsed?.error?.message) {
            detailedMessage = `Gemini API 오류 (${geminiResponse.status}): ${parsed.error.message}`;
          }
        } catch {
          // JSON 파싱이 불가능한 경우 기본 메시지를 사용합니다.
        }

        return new Response(
          JSON.stringify({ error: detailedMessage }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const geminiData = await geminiResponse.json() as any;
      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return new Response(
          JSON.stringify({ error: "AI로부터 유효한 응답을 받지 못했습니다." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = JSON.parse(text);

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Worker Error:", error);
      return new Response(
        JSON.stringify({ error: `서버 오류: ${error.message || "알 수 없는 오류"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
