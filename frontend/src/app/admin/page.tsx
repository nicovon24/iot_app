'use client';

import { useMemo, useState } from 'react';
import { useCustomers } from '@/hooks/users/useCustomers';
import { useCustomerHierarchy } from '@/hooks/users/useCustomerHierarchy';
import { usePermissions } from '@/hooks/users/useCurrentUser';
import { DEFAULT_HIERARCHY_LEVELS } from '@/lib/hierarchy-defaults';
import { ClientWizard } from '@/widgets/forms/ClientWizard';
import { AdminClientsColumn } from '@/widgets/admin/AdminClientsColumn';
import { AdminAssetPanel } from '@/widgets/admin/AdminAssetPanel';
import { AdminDevicePanel } from '@/widgets/admin/AdminDevicePanel';
import type { EntityRef } from '@/types';

export default function AdminPage() {
  const [customerTrail, setCustomerTrail] = useState<EntityRef[]>([]);
  const [assetTrail, setAssetTrail] = useState<EntityRef[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { canWrite } = usePermissions();

  const customersQuery = useCustomers();
  const allCustomers = customersQuery.data?.data ?? [];

  const selectedCustomer = customerTrail.at(-1);

  // The Clients table always shows the selected Client itself (so it stays visible as a row,
  // not just in the breadcrumb) plus its direct sub-Clients below it. With nothing selected,
  // it shows the root-level Clients.
  const visibleCustomers = useMemo(() => {
    if (!selectedCustomer) return allCustomers.filter((c) => !c.parentCustomerId?.id);
    const self = allCustomers.find((c) => c.id === selectedCustomer.id) ?? selectedCustomer;
    const children = allCustomers.filter((c) => c.parentCustomerId?.id === selectedCustomer.id);
    return [self, ...children];
  }, [allCustomers, selectedCustomer]);

  // The Client's hierarchy definition (e.g. Site → Area → Asset → Sensor) drives how many
  // Asset columns are shown. Falls back to the default structure so the full set of columns
  // (Clients, Site, Area, Asset, Sensor) is always visible, even before a Client is selected.
  const hierarchyQuery = useCustomerHierarchy(selectedCustomer?.id);
  const hierarchyLevels = hierarchyQuery.data?.length ? hierarchyQuery.data : DEFAULT_HIERARCHY_LEVELS;

  const activeNode: { id: string; type: 'CUSTOMER' | 'ASSET'; name: string } | null =
    assetTrail.length > 0
      ? { id: assetTrail.at(-1)!.id, type: 'ASSET', name: assetTrail.at(-1)!.name }
      : selectedCustomer
        ? { id: selectedCustomer.id, type: 'CUSTOMER', name: selectedCustomer.name }
        : null;

  const selectCustomer = (customer: EntityRef) => {
    if (customer.id === selectedCustomer?.id) return;
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
  const deviceLevelName = hierarchyLevels.at(-1)?.name ?? 'Sensor';

  // A level's column only has a parentId (and therefore data) once the level before it
  // has a selection — otherwise it renders empty.
  const assetLevels = assetHierarchyLevels.map((level) => {
    const parent = level.levelIndex === 0 ? selectedCustomer : assetTrail[level.levelIndex - 1];
    return {
      levelIndex: level.levelIndex,
      parentId: parent?.id,
      parentType: (level.levelIndex === 0 ? 'CUSTOMER' : 'ASSET') as 'CUSTOMER' | 'ASSET',
      title: level.name,
    };
  });

  // Total number of Miller columns on screen right now (Clients + one per Asset
  // hierarchy level + the trailing Devices column) — drives the grid below so all
  // columns share the available width evenly instead of a fixed-width horizontal
  // scroll that clips the last column off-screen.
  const totalColumns = 1 + assetLevels.length + 1;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <h1 className="text-lg font-semibold text-heading">Admin</h1>

      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2 md:grid md:overflow-x-auto md:overflow-y-hidden"
        style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(240px, 1fr))` }}
      >
        <AdminClientsColumn
          isLoading={customersQuery.isLoading}
          customers={visibleCustomers}
          trail={customerTrail}
          selectedCustomerId={selectedCustomer?.id}
          onSelect={selectCustomer}
          onNavigateTrail={navigateCustomerTrail}
          onAddClient={() => setIsWizardOpen(true)}
          readOnly={!canWrite}
        />

        {assetLevels.map((level) => (
          <AdminAssetPanel
            key={level.levelIndex}
            title={level.title}
            customerId={selectedCustomer?.id}
            parentId={level.parentId}
            parentType={level.parentType}
            levelIndex={level.levelIndex}
            selectedAssetId={assetTrail[level.levelIndex]?.id}
            onSelect={(asset) => selectAsset(level.levelIndex, asset)}
            readOnly={!canWrite}
          />
        ))}

        <AdminDevicePanel title={deviceLevelName} activeNode={activeNode} readOnly={!canWrite} />
      </div>

      <ClientWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        parentCustomerId={selectedCustomer?.id}
      />
    </div>
  );
}
