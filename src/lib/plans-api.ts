import { apiFetch } from './api-client';
import type { Plan, PlanInput, PlanStatus } from '@/types/plan';
import type { PaginatedResult } from '@/types/pagination';

export interface ListPlansParams {
  search?: string;
  status?: PlanStatus | '';
  page?: number;
  limit?: number;
}

export function listPlans(params: ListPlansParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return apiFetch<PaginatedResult<Plan>>(`/plans?${query.toString()}`);
}

export function createPlan(input: PlanInput) {
  return apiFetch<Plan>('/plans', { method: 'POST', body: input });
}

export function updatePlan(id: string, input: Partial<PlanInput>) {
  return apiFetch<Plan>(`/plans/${id}`, { method: 'PATCH', body: input });
}

export function deletePlan(id: string) {
  return apiFetch<void>(`/plans/${id}`, { method: 'DELETE' });
}
