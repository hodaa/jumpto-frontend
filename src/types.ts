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

/** Response shape when a transcription job was created. */
export interface SearchProcessingResponse {
  status: 'processing';
  job_id: string;
  video_id: string;
}

/** Response shape when the selected language does not match the video. */
export interface SearchLanguageMismatchResponse {
  status: 'language_mismatch';
  video_language: string | null;
  message: string;
}

/** Union of possible POST /api/search responses. */
export type SearchResponse =
  SearchFoundResponse | SearchProcessingResponse | SearchLanguageMismatchResponse;

/** Languages the user can search in. */
export type SearchLanguage = 'en' | 'ar';

/** Lifecycle states for a transcription job. */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Response shape for GET /api/status/{job_id}. */
export interface StatusResponse {
  status: JobStatus;
  video_id: string;
  progress: number | null;
  results: SearchMatch[] | null;
  error: string | null;
}

/** Response shape for GET /api/video/{video_id}/search. */
export type VideoSearchResponse = SearchFoundResponse | SearchLanguageMismatchResponse;
