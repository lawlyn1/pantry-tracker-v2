'use client';

import { AddItemForm } from '@/components/AddItemForm';
import { DashboardNav } from '@/components/DashboardNav';
import LogoutButton from '@/components/LogoutButton';
import { PantryList } from '@/components/PantryList';
import { PantryStats } from '@/components/PantryStats';
import { ReceiptImport } from '@/components/ReceiptImport';
import { RecipeGenerator } from '@/components/RecipeGenerator';
import { ShoppingList } from '@/components/ShoppingList';
import { usePantryDashboard } from '@/hooks/usePantryDashboard';

export default function Home() {
  const {
    inventory,
    loading,
    activeTab,
    setActiveTab,
    locationFilter,
    setLocationFilter,
    expiringItems,
    handleDelete,
    handleClearPantry,
  } = usePantryDashboard();

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pantry Tracker</h1>
        <div className="flex items-center gap-2">
          <PantryStats inventory={inventory} />
          <LogoutButton />
        </div>
      </header>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'inventory' && (
          <PantryList
            inventory={inventory}
            loading={loading}
            locationFilter={locationFilter}
            onLocationFilterChange={setLocationFilter}
            onDeleteItem={handleDelete}
            onClearPantry={handleClearPantry}
          />
        )}

        {activeTab === 'add' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Add Item</h2>
            <AddItemForm />
          </div>
        )}

        {activeTab === 'receipt' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Tesco Receipt Import</h2>
            <ReceiptImport />
          </div>
        )}

        {activeTab === 'shop' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Shopping List</h2>
            <ShoppingList />
          </div>
        )}

        {activeTab === 'recipes' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Recipe Ideas</h2>
            <RecipeGenerator expiringItems={expiringItems} />
          </div>
        )}
      </div>

      {/* Bottom Navigation — fixed on mobile */}
      <DashboardNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        expiringItemsCount={expiringItems.length}
      />
    </div>
  );
}
