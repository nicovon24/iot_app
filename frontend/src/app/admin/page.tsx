'use client';

import { useMemo, useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useCustomerHierarchy } from '@/hooks/useCustomerHierarchy';
import { ClientWizard } from '@/widgets/ClientWizard';
import { AdminClientsColumn } from '@/widgets/AdminClientsColumn';
import { AdminAssetPanel } from '@/widgets/AdminAssetPanel';
import { AdminDevicePanel } from '@/widgets/AdminDevicePanel';
import type { EntityRef } from '@/types';

export default function AdminPage() {
  const [customerTrail, setCustomerTrail] = useState<EntityRef[]>([]);
  const [assetTrail, setAssetTrail] = useState<EntityRef[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const customersQuery = useCustomers();
  const allCustomers = customersQuery.data?.data ?? [];

  const selectedCustomer = customerTrail.at(-1);
  const currentParentId = selectedCustomer?.id;
  const visibleCustomers = useMemo(
    () => allCustomers.filter((c) => (c.parentCustomerId?.id ?? undefined) === currentParentId),
    [allCustomers, currentParentId],
  );

  // The Client's hierarchy definition (e.g. Site → Area → Asset → Sensor) drives how many
  // Asset columns are shown — all of them appear up front, empty until their parent level is picked.
  const hierarchyQuery = useCustomerHierarchy(selectedCustomer?.id);
  const hierarchyLevels = hierarchyQuery.data ?? [];

  const activeNode: { id: string; type: 'CUSTOMER' | 'ASSET'; name: string } | null =
    assetTrail.length > 0
      ? { id: assetTrail.at(-1)!.id, type: 'ASSET', name: assetTrail.at(-1)!.name }
      : selectedCustomer
        ? { id: selectedCustomer.id, type: 'CUSTOMER', name: selectedCustomer.name }
        : null;

  const selectCustomer = (customer: EntityRef) => {
    setCustomerTrail([...customerTrail, customer]);
    setAssetTrail([]);
  };

  const navigateCustomerTrail = (index: number) => {
    setCustomerTrail(index === -1 ? [] : customerTrail.slice(0, index + 1));
    setAssetTrail([]);
  };

  // Clicking a selected row again collapses that level and everything after it;
  // clicking a different row replaces the selection from that level down.
  const selectAsset = (levelIndex: number, asset: EntityRef) => {
    if (assetTrail[levelIndex]?.id === asset.id) {
      setAssetTrail(assetTrail.slice(0, levelIndex));
    } else {
      setAssetTrail([...assetTrail.slice(0, levelIndex), asset]);
    }
  };

  // One column per hierarchy level except the last — the last level (e.g. "Sensor") isn't
  // an Asset column, it's where real Devices get linked, shown by AdminDevicePanel instead.
  const assetHierarchyLevels = hierarchyLevels.slice(0, -1);
  const deviceLevelName = hierarchyLevels.at(-1)?.name ?? 'Devices';

  // A level's column only has a parentId (and therefore data) once the level before it
  // has a selection — otherwise it renders empty.
  const assetLevels = selectedCustomer
    ? assetHierarchyLevels.map((level) => {
        const parent = level.levelIndex === 0 ? selectedCustomer : assetTrail[level.levelIndex - 1];
        return {
          levelIndex: level.levelIndex,
          parentId: parent?.id,
          parentType: (level.levelIndex === 0 ? 'CUSTOMER' : 'ASSET') as 'CUSTOMER' | 'ASSET',
          title: level.name,
        };
      })
    : [];

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <h1 className="text-lg font-semibold text-heading">Admin</h1>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2 md:grid md:auto-cols-[minmax(320px,380px)] md:grid-flow-col md:justify-start md:overflow-x-auto md:overflow-y-hidden">
        <AdminClientsColumn
          isLoading={customersQuery.isLoading}
          customers={visibleCustomers}
          trail={customerTrail}
          selectedCustomerId={selectedCustomer?.id}
          onSelect={selectCustomer}
          onNavigateTrail={navigateCustomerTrail}
          onAddClient={() => setIsWizardOpen(true)}
        />

        {assetLevels.map((level) => (
          <AdminAssetPanel
            key={level.levelIndex}
            title={level.title}
            customerId={selectedCustomer!.id}
            parentId={level.parentId}
            parentType={level.parentType}
            levelIndex={level.levelIndex}
            selectedAssetId={assetTrail[level.levelIndex]?.id}
            onSelect={(asset) => selectAsset(level.levelIndex, asset)}
          />
        ))}

        <AdminDevicePanel title={deviceLevelName} activeNode={activeNode} />
      </div>

      <ClientWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        parentCustomerId={selectedCustomer?.id}
      />
    </div>
  );
}
