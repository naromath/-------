/**
 * Gemini 농기계 분석 서비스
 * 
 * Cloudflare Worker 백엔드 프록시를 통해 Gemini API를 호출합니다.
 * API 키는 서버 사이드에서 안전하게 관리됩니다.
 */

// Worker API 엔드포인트 (배포 후 실제 URL로 교체됨)
// 환경변수 또는 빌드 시 주입
// 로컬 개발은 기본적으로 Vite 프록시(/api -> 로컬 Worker)를 사용합니다.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const AGRICULTURAL_MACHINERY = [
  "동력경운기",
  "트랙터",
  "콤바인",
  "승용관리기",
  "승용이앙기",
  "SS 분무기",
  "광역방제기",
  "베일러(결속기)",
  "농용굴삭기",
  "농용로우더",
  "농용동력운반차",
  "항공방제기",
  "지자체 소유 임대농기계"
] as const;

export type MachineryType = typeof AGRICULTURAL_MACHINERY[number] | "기타/확인불가";

export interface AngleAnalysis {
  photoNumber: number;
  detectedAngle: string;
  observations: string;
}

export interface AnalysisResult {
  machineryType: MachineryType;
  confidence: number;
  reason: string;
  features: string[];
  angleAnalysis: AngleAnalysis[];
}

/**
 * 여러 장의 농기계 사진을 Worker 프록시를 통해 종합 분석합니다.
 */
export async function analyzeMachineryImages(
  images: { base64: string; mimeType: string }[]
): Promise<AnalysisResult> {
  if (images.length === 0) {
    throw new Error("최소 1장의 이미지가 필요합니다.");
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(errorData.error || `서버 오류 (${response.status})`);
    }

    const result = await response.json() as AnalysisResult;
    return result;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      throw new Error("서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.");
    }
    throw new Error(error.message || "분석 중 알 수 없는 오류가 발생했습니다.");
  }
}
