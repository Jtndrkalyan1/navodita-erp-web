# Delete Confirmation Modal - Usage Guide

## ConfirmDeleteModal Component

A reusable delete confirmation modal with loading states and customizable messages.

### Basic Usage

```jsx
import { useState } from 'react';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import api from '../../services/api';

function MyComponent() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (item) => {
    setDeleteTarget(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/invoices/${deleteTarget.id}`);
      // Refresh list or remove from state
      alert('Deleted successfully');
      setShowDeleteModal(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  return (
    <div>
      <button onClick={() => handleDeleteClick(someItem)}>
        Delete
      </button>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.invoice_number}
        isDeleting={isDeleting}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Called when user cancels or clicks X |
| `onConfirm` | function | required | Called when user confirms deletion |
| `title` | string | "Confirm Delete" | Modal header text |
| `message` | string | auto-generated | Custom confirmation message |
| `itemName` | string | null | Name of item being deleted (shown in default message) |
| `isDeleting` | boolean | false | Shows loading spinner, disables buttons |

### Custom Message Example

```jsx
<ConfirmDeleteModal
  isOpen={showDeleteModal}
  onClose={handleDeleteCancel}
  onConfirm={handleDeleteConfirm}
  title="Delete Customer"
  message="Deleting this customer will also remove all associated invoices and payment history. Are you sure?"
  itemName={customer.display_name}
  isDeleting={isDeleting}
/>
```

### Integration with Existing Pages

To add delete confirmation to an existing page:

1. **Import the component:**
   ```jsx
   import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
   ```

2. **Add state:**
   ```jsx
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [isDeleting, setIsDeleting] = useState(false);
   ```

3. **Update delete button to show modal:**
   ```jsx
   // Before:
   onClick={() => handleDelete(item.id)}

   // After:
   onClick={() => {
     setDeleteTarget(item);
     setShowDeleteModal(true);
   }}
   ```

4. **Create confirmation handler:**
   ```jsx
   const handleDeleteConfirm = async () => {
     setIsDeleting(true);
     try {
       await api.delete(`/resource/${deleteTarget.id}`);
       // Refresh or update state
       setShowDeleteModal(false);
     } catch (error) {
       console.error('Delete failed:', error);
     } finally {
       setIsDeleting(false);
     }
   };
   ```

5. **Add modal to JSX:**
   ```jsx
   <ConfirmDeleteModal
     isOpen={showDeleteModal}
     onClose={() => setShowDeleteModal(false)}
     onConfirm={handleDeleteConfirm}
     itemName={deleteTarget?.name}
     isDeleting={isDeleting}
   />
   ```

### Features

- ✅ Loading spinner during delete operation
- ✅ Disabled buttons while deleting
- ✅ Warning icon for visual emphasis
- ✅ Customizable title and message
- ✅ Keyboard accessible
- ✅ Click outside to close (via X button)
- ✅ Tailwind CSS styled
- ✅ Responsive design

### Notes

- Modal blocks interaction with rest of page (z-50)
- Delete button is red to indicate destructive action
- Loading state prevents accidental double-clicks
- Auto-generates user-friendly message if itemName provided
