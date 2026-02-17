export type PipelineInputType = 'markdown' | 'casebundle';

export type PipelineRunRequest = {
  inputType: PipelineInputType;
  payload: string | Record<string, any>;
  token?: string;
  caseId?: string;
};

export type PipelineRunResponse = {
  markdown: string;
  report: any;
  qa: any;
  risk: any;
};

const resolvePipelineUrl = () => {
  const envUrl = process.env.PIPELINE_URL || process.env.VITE_PIPELINE_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/pipeline`;
  }
  return 'http://localhost:7070';
};

const PIPELINE_URL = resolvePipelineUrl();

export async function runPipeline(request: PipelineRunRequest): Promise<PipelineRunResponse> {
  const { inputType, payload, token, caseId } = request;

  const response = await fetch(`${PIPELINE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-radon-token': token } : {}),
    },
    body: JSON.stringify({
      input_type: inputType,
      payload,
      case_id: caseId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pipeline error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function pipelineHealthCheck(token?: string): Promise<boolean> {
  try {
    const response = await fetch(`${PIPELINE_URL}/health`, {
      headers: token ? { 'x-radon-token': token } : undefined,
    });
    return response.ok;
  } catch {
    return false;
  }
}
