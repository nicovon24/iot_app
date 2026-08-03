'use client';

import { useState } from 'react';
import { Select, SelectItem } from '@heroui/react';
import { useGlobalAlarms } from '@/hooks/useEntityAlarms';
import { AlarmsListWidget } from '@/widgets/AlarmsListWidget';
import type { AlarmSeverity, AlarmStatus } from '@/types';

const SEVERITIES: AlarmSeverity[] = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE'];
const STATUSES: AlarmStatus[] = ['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK'];

const SELECT_CLASSNAMES = {
  label: 'text-sm font-medium text-body',
  trigger:
    'rounded-md border border-border bg-surface-card data-[hover=true]:bg-surface data-[open=true]:border-accent shadow-none',
  value: 'text-sm text-heading',
  popoverContent: 'rounded-md border border-border bg-surface-card shadow-lg',
};

export default function AlarmsPage() {
  const [severity, setSeverity] = useState<AlarmSeverity | undefined>(undefined);
  const [status, setStatus] = useState<AlarmStatus | undefined>(undefined);

  const alarmsQuery = useGlobalAlarms({ severity, status });

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex shrink-0 gap-4 rounded-xl border border-border bg-surface-card p-4 shadow-sm">
        <Select
          label="Severity"
          placeholder="All severities"
          labelPlacement="outside"
          variant="bordered"
          className="w-56"
          classNames={SELECT_CLASSNAMES}
          selectedKeys={severity ? [severity] : []}
          onSelectionChange={(keys) => {
            const [key] = Array.from(keys) as string[];
            setSeverity((key as AlarmSeverity) ?? undefined);
          }}
        >
          {SEVERITIES.map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>

        <Select
          label="Status"
          placeholder="All statuses"
          labelPlacement="outside"
          variant="bordered"
          className="w-56"
          classNames={SELECT_CLASSNAMES}
          selectedKeys={status ? [status] : []}
          onSelectionChange={(keys) => {
            const [key] = Array.from(keys) as string[];
            setStatus((key as AlarmStatus) ?? undefined);
          }}
        >
          {STATUSES.map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="min-h-0 flex-1">
        <AlarmsListWidget
          alarms={alarmsQuery.data?.data}
          isLoading={alarmsQuery.isLoading}
          isError={alarmsQuery.isError}
          error={alarmsQuery.error}
          emptyLabel="No alarms match the current filters"
        />
      </div>
    </div>
  );
}
