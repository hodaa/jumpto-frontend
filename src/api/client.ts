import axios from 'axios';
import type { SearchLanguage, SearchResponse, StatusResponse, VideoSearchResponse } from '../types';

/** Error whose message can be shown to the user. */
export class ApiError extends Error {
  messageKey: string;
  serverMessage?: string;

  constructor(messageKey: string, serverMessage?: string) {
    super(messageKey);
    this.name = 'ApiError';
    this.messageKey = messageKey;
    this.serverMessage = serverMessage;
  }
}

const http = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  timeout: 30_000,
});

interface ErrorPayload {
  response?: { status?: number; data?: { error?: { message?: string }; detail?: unknown } };
  code?: string;
  request?: unknown;
}

function toApiError(error: unknown): ApiError {
  const payload = error as ErrorPayload;
  const data = payload.response?.data;
  const serverMessage = data?.error?.message;
  if (payload.response) {
    const status = payload.response.status;
    if (status === 400) return new ApiError('error.invalidUrl', serverMessage);
    if (status === 404) return new ApiError('error.jobGone', serverMessage);
    if (status === 422) return new ApiError('error.validation', serverMessage);
    return new ApiError('error.server', serverMessage);
  }
  if (!payload.response && payload.request) {
    return new ApiError('error.network');
  }
  return new ApiError('error.server');
}

/** Submit a search; resolves to found results or a created job. */
export async function submitSearch(
  youtubeUrl: string,
  keyword: string,
  language: SearchLanguage,
): Promise<SearchResponse> {
  try {
    const { data } = await http.post<SearchResponse>('/api/search', {
      youtube_url: youtubeUrl,
      keyword,
      language,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Fetch the current status of a transcription job. */
export async function fetchJobStatus(jobId: string): Promise<StatusResponse> {
  try {
    const { data } = await http.get<StatusResponse>(`/api/status/${jobId}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Fetch cached search results for a transcribed video. */
export async function fetchVideoSearch(
  videoId: string,
  keyword: string,
  language: SearchLanguage,
): Promise<VideoSearchResponse> {
  try {
    const { data } = await http.get<VideoSearchResponse>(`/api/video/${videoId}/search`, {
      params: { keyword, language },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
