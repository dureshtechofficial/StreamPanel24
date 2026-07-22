import { apiFetch } from './api-client';
import type {
  UpdateWalletTopupSettingInput,
  WalletTopupActor,
  WalletTopupSetting,
} from '@/types/razorpay';

export function listWalletTopupSettings() {
  return apiFetch<WalletTopupSetting[]>('/settings/wallet-topup');
}

export function updateWalletTopupSetting(
  actorType: WalletTopupActor,
  input: UpdateWalletTopupSettingInput,
) {
  return apiFetch<WalletTopupSetting>(`/settings/wallet-topup/${actorType}`, {
    method: 'PATCH',
    body: input,
  });
}
