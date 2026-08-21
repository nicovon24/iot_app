'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { Plus, X, Cpu, UserPlus } from 'lucide-react';
import { useCustomerChildren, useAssetChildren } from '@/hooks';
import { useLinkDevice, useUnlinkDevice, useClaimDevice } from '@/hooks';
import { useEntities } from '@/hooks';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogBody, DialogFooter } from '@/components';
import { Select } from '@/components';
import { TableRowsSkeleton } from '@/components';
import { toastError, toastSuccess } from '@/lib';

export interface AdminDevicePanelProps {
  title: string;
  activeNode: { id: string; type: 'CUSTOMER' | 'ASSET'; name: string } | null;
  readOnly?: boolean;
}

const TABLE_CLASSNAMES = {
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none overflow-y-auto',
  th: 'bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-left py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 transition-colors',
};

export function AdminDevicePanel({ title, activeNode, readOnly = false }: AdminDevicePanelProps) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [pickedDeviceId, setPickedDeviceId] = useState<string | undefined>(undefined);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [claimDeviceId, setClaimDeviceId] = useState<string | undefined>(undefined);

  const customerChildren = useCustomerChildren(activeNode?.type === 'CUSTOMER' ? activeNode.id : undefined);
  const assetChildren = useAssetChildren(activeNode?.type === 'ASSET' ? activeNode.id : undefined);
  const children = activeNode?.type === 'ASSET' ? assetChildren.data : customerChildren.data;
  const isLoading = activeNode?.type === 'ASSET' ? assetChildren.isLoading : customerChildren.isLoading;

  const devicesQuery = useEntities('DEVICE');
  const linkDevice = useLinkDevice();
  const unlinkDevice = useUnlinkDevice();
  const claimDevice = useClaimDevice();

  const linkedIds = useMemo(() => new Set((children?.devices ?? []).map((d) => d.id)), [children]);
  const availableDevices = useMemo(
    () => (devicesQuery.data?.data ?? []).filter((d) => !linkedIds.has(d.id)),
    [devicesQuery.data, linkedIds],
  );
  // Devices ThingsBoard has never assigned to a real Customer — a Customer User must
  // claim one of these into their own customer before it can be linked to an Asset.
  const unclaimedDevices = useMemo(
    () => (devicesQuery.data?.data ?? []).filter((d) => !d.customerId),
    [devicesQuery.data],
  );

  const canAssign = activeNode?.type === 'ASSET';

  const closeAssign = () => {
    setIsAssignOpen(false);
    setPickedDeviceId(undefined);
    linkDevice.reset();
  };

  const closeClaim = () => {
    setIsClaimOpen(false);
    setClaimDeviceId(undefined);
    claimDevice.reset();
  };

  const devices = children?.devices ?? [];

  return (
    <div className="glass-card flex h-96 shrink-0 flex-col gap-3 p-4 md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="truncate text-sm font-semibold text-heading" title={title}>
          {title}
        </h2>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsClaimOpen(true)}
              title="Claim a Device with no Customer into your own Customer"
              className="flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: 'var(--gradient-accent-from)' }}
            >
              <UserPlus size={12} /> Claim
            </button>
            <button
              type="button"
              disabled={!canAssign}
              onClick={() => setIsAssignOpen(true)}
              title={canAssign ? undefined : 'Select an Asset to assign a Device'}
              className="flex items-center gap-1 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
              style={{ color: 'var(--gradient-accent-from)' }}
            >
              <Plus size={12} /> Assign
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!activeNode && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">Select a Client or Asset to see its Devices.</p>
          </div>
        )}

        {activeNode && isLoading && <TableRowsSkeleton rows={3} columns={2} />}

        {activeNode && !isLoading && devices.length === 0 && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">
              No Devices assigned{canAssign ? '' : ' (select an Asset to assign one)'}.
            </p>
          </div>
        )}

        {activeNode && !isLoading && devices.length > 0 && (
          <Table aria-label="Assigned devices" classNames={TABLE_CLASSNAMES}>
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={devices}>
              {(device) => (
                <TableRow key={device.id} className="group">
                  <TableCell className="font-medium text-heading">
                    <span className="flex items-center gap-2">
                      <Cpu size={14} className="text-muted" /> {device.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            activeNode &&
                            unlinkDevice.mutate(
                              { assetId: activeNode.id, deviceId: device.id },
                              {
                                onSuccess: () => toastSuccess('Device unassigned', device.name),
                                onError: (error) => toastError("Couldn't unassign device", error),
                              },
                            )
                          }
                          className="rounded p-1 text-red-600 hover:bg-surface"
                          aria-label="Unassign"
                          title="Unassign"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog isOpen={isAssignOpen} onClose={closeAssign}>
        <DialogHeader>
          <DialogTitle>Assign Device</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody>
          <Select
            label="Device"
            placeholder="Select a Device"
            value={pickedDeviceId}
            onChange={setPickedDeviceId}
            options={availableDevices.map((d) => ({ value: d.id, label: d.name }))}
          />
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={closeAssign} className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface">
            Cancel
          </button>
          <button
            type="button"
            disabled={!pickedDeviceId || linkDevice.isPending}
            onClick={() => {
              if (!activeNode || !pickedDeviceId) return;
              const deviceName = availableDevices.find((d) => d.id === pickedDeviceId)?.name;
              linkDevice.mutate(
                { assetId: activeNode.id, deviceId: pickedDeviceId },
                {
                  onSuccess: () => {
                    closeAssign();
                    toastSuccess('Device assigned', deviceName);
                  },
                  onError: (error) => toastError("Couldn't assign device", error),
                },
              );
            }}
            style={{ background: 'var(--gradient-accent)' }}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {linkDevice.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog isOpen={isClaimOpen} onClose={closeClaim}>
        <DialogHeader>
          <DialogTitle>Claim Device</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-sm text-muted">
            Claims a Device with no Customer into your own Customer, so it can then be assigned to an Asset.
          </p>
          <Select
            label="Device"
            placeholder={unclaimedDevices.length === 0 ? 'No unclaimed devices' : 'Select a Device'}
            value={claimDeviceId}
            onChange={setClaimDeviceId}
            options={unclaimedDevices.map((d) => ({ value: d.id, label: d.name }))}
          />
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={closeClaim} className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface">
            Cancel
          </button>
          <button
            type="button"
            disabled={!claimDeviceId || claimDevice.isPending}
            onClick={() => {
              if (!claimDeviceId) return;
              const deviceName = unclaimedDevices.find((d) => d.id === claimDeviceId)?.name;
              claimDevice.mutate(claimDeviceId, {
                onSuccess: () => {
                  closeClaim();
                  toastSuccess('Device claimed', deviceName);
                },
                onError: (error) => toastError("Couldn't claim device", error),
              });
            }}
            style={{ background: 'var(--gradient-accent)' }}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {claimDevice.isPending ? 'Claiming…' : 'Claim'}
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
