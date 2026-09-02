'use client';

import { useState } from 'react';
import { Select } from '@/components';
import { useGlobalAlarms } from '@/hooks';
import { AlarmsListWidget } from '@/widgets';
import { PageHeader, StatusPill } from '@/components';
import type { AlarmSeverity, AlarmStatus } from '@/types';

const SEVERITIES: AlarmSeverity[] = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE'];
const STATUSES: AlarmStatus[] = ['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK'];

/** Sentinel value for "no filter" — the shared Select always needs a real string, same pattern
 * as /users' ALL_CLIENTS and DatasourcePicker's scope options. */
const ALL = '__all__';

export default function AlarmsPage() {
  const [severity, setSeverity] = useState<AlarmSeverity | undefined>(undefined);
  const [status, setStatus] = useState<AlarmStatus | undefined>(undefined);

  const alarmsQuery = useGlobalAlarms({ severity, status });

  const activeCount = (alarmsQuery.data?.data ?? []).filter(
    (a) => a.status === 'ACTIVE_UNACK' || a.status === 'ACTIVE_ACK',
  ).length;

  return (
    <div className="flex h-full w-full flex-col">
      <PageHeader
        title="Alarms"
        description="Every alarm raised across the fleet. Filter by severity or status to narrow the list."
        actions={
          activeCount > 0 ? (
            <StatusPill label={`${activeCount} active`} />
          ) : (
            <StatusPill label="All clear" muted />
          )
        }
      />

      <div className="rule-2 mt-[30px] flex shrink-0 gap-4 pt-5">
        <div className="w-56">
          <Select
            label="Severity"
            value={severity ?? ALL}
            onChange={(v) => setSeverity(v === ALL ? undefined : (v as AlarmSeverity))}
            options={[
              { value: ALL, label: 'All severities' },
              ...SEVERITIES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        <div className="w-56">
          <Select
            label="Status"
            value={status ?? ALL}
            onChange={(v) => setStatus(v === ALL ? undefined : (v as AlarmStatus))}
            options={[
              { value: ALL, label: 'All statuses' },
              ...STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1">
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
