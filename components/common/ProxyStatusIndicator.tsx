import React from 'react';
import type { ProxyStatus } from '../../types';
import { Tooltip } from './Tooltip';
import { ServerIcon } from '../icons/Icons';

interface ProxyStatusIndicatorProps {
  status: ProxyStatus;
}

const getStatusInfo = (status: ProxyStatus) => {
  switch (status) {
    case 'IDLE':
      return {
        color: 'text-slate-500',
        tooltip: 'Status Proxy: Idle. Menunggu permintaan.',
        animation: '',
      };
    case 'PENDING':
      return {
        color: 'text-amber-400',
        tooltip: 'Status Proxy: Tertunda. Sedang mengirim permintaan ke server.',
        animation: 'animate-pulse',
      };
    case 'SUCCESS':
      return {
        color: 'text-green-500',
        tooltip: 'Status Proxy: Berhasil. Permintaan terakhir berhasil.',
        animation: '',
      };
    case 'ERROR':
      return {
        color: 'text-red-500',
        tooltip: 'Status Proxy: Gagal. Terjadi kesalahan pada permintaan terakhir.',
        animation: '',
      };
    default:
        return { color: 'text-slate-500', tooltip: 'Status Proxy: Tidak Diketahui', animation: '' };
  }
};

export const ProxyStatusIndicator: React.FC<ProxyStatusIndicatorProps> = ({ status }) => {
  const { color, tooltip, animation } = getStatusInfo(status);

  return (
    <Tooltip text={tooltip}>
        <div className={`transition-colors ${animation}`}>
            <ServerIcon className={`w-5 h-5 ${color}`} />
        </div>
    </Tooltip>
  );
};