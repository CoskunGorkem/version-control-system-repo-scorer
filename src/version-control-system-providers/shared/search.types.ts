export interface VcsSearchParams {
  language: string;
  createdFrom: string; // ISO date string YYYY-MM-DD
  perPage?: number;
  page?: number;
  sort?: string;
  order?: string;
}
