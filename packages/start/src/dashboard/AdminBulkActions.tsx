interface AdminBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  isDeleting: boolean;
  onClear: () => void;
}

export const AdminBulkActions: React.FC<AdminBulkActionsProps> = ({
  selectedCount,
  onDelete,
  isDeleting,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-50 border-b border-brand-200 text-sm">
      <span className="font-medium text-brand-800">
        {selectedCount} selected
      </span>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="px-3 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-xs"
      >
        {isDeleting ? 'Deleting…' : `Delete ${selectedCount}`}
      </button>
      <button
        onClick={onClear}
        className="text-brand-700 hover:text-brand-900 text-xs underline"
      >
        Clear selection
      </button>
    </div>
  );
};
