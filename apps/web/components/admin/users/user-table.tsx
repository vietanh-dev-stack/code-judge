'use client';

import { useState, useEffect, useCallback } from 'react';
import { PaginatedResponse, usersApi } from '@/services/user.apis';
import { Role } from '@/types/enums';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  ShieldAlert,
  Ban,
  CheckCircle,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '@/services/auth.apis';
import CreateUserDialog from './create-user-dialog';

export default function UserTable() {
  const [data, setData] = useState<PaginatedResponse<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);

  // States cho filter và pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Debounce logic cho ô tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset về trang 1 khi search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch dữ liệu
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers({ page, limit, search: debouncedSearch });
      setData(res);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Hành động: Đổi Role
  const handleUpdateRole = async (user: UserProfile) => {
    const newRole = user.role === Role.ADMIN ? Role.CLIENT : Role.ADMIN;
    try {
      await usersApi.updateUserRole(user.id, { role: newRole });
      fetchUsers();
    } catch (error) {
      alert('Permission update error!');
    }
  };

  // Hành động: Khóa/Mở
  const handleToggleStatus = async (user: UserProfile) => {
    try {
      // Giả sử UserProfile có trường isActive (nếu chưa có trong type, bạn cần thêm vào auth.apis.ts)
      await usersApi.toggleUserStatus(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch (error) {
      alert('Status update error!');
    }
  };

  // Hành động: Xóa
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disable this user?')) return;
    try {
      await usersApi.deleteUser(id);
      fetchUsers();
    } catch (error) {
      alert('User deletion error!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-sm w-full relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <CreateUserDialog onSuccess={fetchUsers} />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? 'outline' : 'destructive'}
                      className={
                        user.isActive ? 'text-green-500 border-green-500/20 bg-green-500/10' : ''
                      }
                    >
                      {user.isActive ? 'Active' : 'Lock'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Option</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateRole(user)}>
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          {user.role === Role.ADMIN ? 'Downgrade to Client' : 'Upgrade to Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          {user.isActive ? (
                            <Ban className="mr-2 h-4 w-4" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          {user.isActive ? 'Lock' : 'Unlock'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(user.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground font-medium">
            Page {page} / {data.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
