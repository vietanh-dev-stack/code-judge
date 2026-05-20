import UserTable from '@/components/admin/users/user-table';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý người dùng | Admin Dashboard',
};

export default function AdminUsersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-muted-foreground">
            Manage accounts, assign permissions, and monitor system activity.
          </p>
        </div>
      </div>
      
      {/* Component chứa toàn bộ logic xử lý */}
      <UserTable />
    </div>
  );
}