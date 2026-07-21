import { resellerApiFetch } from './reseller-api-client';
import type { Plan } from '@/types/plan';

export function listMyVisiblePlans() {
  return resellerApiFetch<Plan[]>('/reseller-auth/plans');
}
