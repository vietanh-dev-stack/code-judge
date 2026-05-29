'use client';

import { useState, useEffect } from 'react';
import { tagsApi, Tag } from '@/services/tags.apis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, MoreVertical, Loader2, Tag as TagIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminToast } from '@/lib/admin-toast';

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await tagsApi.findAll();
      setTags(data);
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to load tags.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const openCreateDialog = () => {
    setEditingTag(null);
    setName('');
    setSlug('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setSlug(tag.slug);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSubmitting(true);
    try {
      if (editingTag) {
        // Edit tag
        await tagsApi.update(editingTag.id, {
          name: trimmedName,
          slug: slug.trim() || undefined,
        });
        adminToast.success('Tag updated successfully.');
      } else {
        // Create tag
        await tagsApi.create({
          name: trimmedName,
          slug: slug.trim() || undefined,
        });
        adminToast.success('Tag created successfully.');
      }
      setIsDialogOpen(false);
      void loadTags();
    } catch (error: unknown) {
      adminToast.errorFrom(error, 'Failed to save tag.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (
      !confirm(
        `Are you sure you want to delete tag "${tag.name}"? This will untag all associated problems.`,
      )
    ) {
      return;
    }
    try {
      await tagsApi.delete(tag.id);
      adminToast.success('Tag deleted successfully.');
      void loadTags();
    } catch (error: unknown) {
      adminToast.errorFrom(error, 'Failed to delete tag.');
    }
  };

  // Filter tags locally
  const filteredTags = tags.filter((t) => {
    const term = search.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term);
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tags Management</h1>
          <p className="text-muted-foreground mt-1">Manage problem classification tags</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Tag
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tags by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border focus:ring-primary"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10 hover:bg-muted/10">
              <TableHead>Tag Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={4} className="h-16 bg-muted/10" />
                </TableRow>
              ))
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <TagIcon className="w-8 h-8 text-muted-foreground/50" />
                    <p>No tags found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag) => (
                <TableRow key={tag.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-semibold text-foreground">{tag.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{tag.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          onClick={() => void handleDelete(tag)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
              <DialogDescription>
                {editingTag
                  ? 'Modify tag details in the system.'
                  : 'Add a new tag classification for problems.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Dynamic Programming"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">
                  Slug <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="slug"
                  placeholder="e.g. dynamic-programming"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave empty to automatically generate from tag name. Must be lowercase,
                  alphanumeric, and unique.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
