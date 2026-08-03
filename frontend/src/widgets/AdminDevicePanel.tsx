'use client';

import { useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Plus, X, Cpu } from 'lucide-react';
import { useCustomerChildren, useAssetChildren } from '@/hooks/useHierarchyChildren';
import { useLinkDevice, useUnlinkDevice } from '@/hooks/useDeviceLink';
import { useEntities } from '@/hooks/useEntities';
import { ApiError } from '@/lib/api-client';

export interface AdminDevicePanelProps {
  title: string;
  activeNode: { id: string; type: 'CUSTOMER' | 'ASSET'; name: string } | null;
}

const TABLE_CLASSNAMES = {
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none overflow-y-auto',
  th: 'bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-left py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 transition-colors',
};

export function AdminDevicePanel({ title, activeNode }: AdminDevicePanelProps) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [pickedDeviceId, setPickedDeviceId] = useState<string | undefined>(undefined);

  const customerChildren = useCustomerChildren(activeNode?.type === 'CUSTOMER' ? activeNode.id : undefined);
  const assetChildren = useAssetChildren(activeNode?.type === 'ASSET' ? activeNode.id : undefined);
  const children = activeNode?.type === 'ASSET' ? assetChildren.data : customerChildren.data;
  const isLoading = activeNode?.type === 'ASSET' ? assetChildren.isLoading : customerChildren.isLoading;

  const devicesQuery = useEntities('DEVICE');
  const linkDevice = useLinkDevice();
  const unlinkDevice = useUnlinkDevice();

  const linkedIds = useMemo(() => new Set((children?.devices ?? []).map((d) => d.id)), [children]);
  const availableDevices = useMemo(
    () => (devicesQuery.data?.data ?? []).filter((d) => !linkedIds.has(d.id)),
    [devicesQuery.data, linkedIds],
  );

  const canAssign = activeNode?.type === 'ASSET';

  const closeAssign = () => {
    setIsAssignOpen(false);
    setPickedDeviceId(undefined);
    linkDevice.reset();
  };

  const errorMessage =
    linkDevice.error instanceof ApiError ? linkDevice.error.message : linkDevice.error ? 'Unknown error' : null;

  const devices = children?.devices ?? [];

  return (
    <div className="flex h-96 shrink-0 flex-col gap-3 rounded-xl border border-border bg-surface-card p-4 shadow-sm md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="truncate text-sm font-semibold text-heading" title={title}>
          {title}
        </h2>
        <button
          type="button"
          disabled={!canAssign}
          onClick={() => setIsAssignOpen(true)}
          title={canAssign ? undefined : 'Select an Asset to assign a Device'}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-body hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={12} /> Assign
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!activeNode && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">Select a Client or Asset to see its Devices.</p>
          </div>
        )}

        {activeNode && isLoading && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <Spinner label="Loading…" color="primary" />
          </div>
        )}

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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => activeNode && unlinkDevice.mutate({ assetId: activeNode.id, deviceId: device.id })}
                        className="rounded p-1 text-red-600 hover:bg-surface"
                        aria-label="Unassign"
                        title="Unassign"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal isOpen={isAssignOpen} onClose={closeAssign} size="sm" placement="center" classNames={{ base: 'w-full max-w-sm my-auto rounded-2xl bg-surface-card border border-border' }}>
        <ModalContent>
          <ModalHeader className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-heading">Assign Device</h2>
          </ModalHeader>
          <ModalBody className="px-6 py-4">
            <Select
              label="Device"
              placeholder="Select a Device"
              labelPlacement="outside"
              variant="bordered"
              size="sm"
              classNames={{
                label: 'text-sm font-medium text-body',
                trigger: 'rounded-md border border-border bg-surface data-[hover=true]:bg-surface-card data-[open=true]:border-accent shadow-none',
                value: 'text-sm text-heading',
                popoverContent: 'rounded-md border border-border bg-surface-card shadow-lg',
              }}
              selectedKeys={pickedDeviceId ? [pickedDeviceId] : []}
              onSelectionChange={(keys) => {
                const [key] = Array.from(keys) as string[];
                setPickedDeviceId(key);
              }}
            >
              {availableDevices.map((d) => (
                <SelectItem key={d.id}>{d.name}</SelectItem>
              ))}
            </Select>
            {errorMessage && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
            )}
          </ModalBody>
          <ModalFooter className="border-t border-border px-6 py-4">
            <button type="button" onClick={closeAssign} className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface">
              Cancel
            </button>
            <button
              type="button"
              disabled={!pickedDeviceId || linkDevice.isPending}
              onClick={() => {
                if (!activeNode || !pickedDeviceId) return;
                linkDevice.mutate({ assetId: activeNode.id, deviceId: pickedDeviceId }, { onSuccess: closeAssign });
              }}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
            >
              {linkDevice.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
