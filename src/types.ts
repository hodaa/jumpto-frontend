/** Shared API types mirroring the JumpTo backend contract. */

/** A single timestamp result for a keyword match. */
export interface SearchMatch {
  timestamp: string;
  progress_seconds: number;
  text_snippet: string | null;
}

/** Response shape when results were found in cache. */
export interface SearchFoundResponse {
  status: 'found';
  results: SearchMatch[];
}

/** Response shape when the video is transcribed but the phrase has no matches. */
export interface SearchNotFoundResponse {
  status: 'not_found';
  results: [];
}

/** Response shape when a transcription job was created. */
export interface SearchProcessingResponse {
  status: 'processing';
  job_id: string;
  video_id: string;
}

/** Union of possible POST /api/search responses. */
export type SearchResponse =
  | SearchFoundResponse
  | SearchNotFoundResponse
  | SearchProcessingResponse;

/** Lifecycle states for a transcription job. */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Response shape for GET /api/status/{job_id}. */
export interface StatusResponse {
  status: JobStatus;
  video_id: string;
  progress: number | null;
  results: SearchMatch[] | null;
  error: string | null;
  video_language: string | null;
}

/** Response shape for GET /api/video/{video_id}/language. */
export interface VideoLanguageResponse {
  language: string | null;
}

/** Response shape for GET /api/video/{video_id}/search. */
export type VideoSearchResponse = SearchFoundResponse | SearchNotFoundResponse;