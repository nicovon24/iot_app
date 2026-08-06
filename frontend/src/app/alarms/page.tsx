'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { useGlobalAlarms } from '@/hooks/useEntityAlarms';
import { AlarmsListWidget } from '@/widgets/entity/AlarmsListWidget';
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

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="glass-card flex shrink-0 gap-4 p-4">
        <div className="w-56">
          <Select
            label="Severity"
            value={severity ?? ALL}
            onChange={(v) => setSeverity(v === ALL ? undefined : (v as AlarmSeverity))}
            options={[{ value: ALL, label: 'All severities' }, ...SEVERITIES.map((s) => ({ value: s, label: s }))]}
          />
        </div>

        <div className="w-56">
          <Select
            label="Status"
            value={status ?? ALL}
            onChange={(v) => setStatus(v === ALL ? undefined : (v as AlarmStatus))}
            options={[{ value: ALL, label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </div>
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
