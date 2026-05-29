import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, UserMinus } from 'lucide-react';

interface PersonItemProps {
  name: string;
  avatarUrl?: string | null;
  showRemove?: boolean;
  onRemove?: () => void;
}

export default function PersonItem({
  name,
  avatarUrl,
  showRemove,
  onRemove,
}: PersonItemProps) {
  return (
    <div className="group flex items-center justify-between rounded-md border-b border-border px-2 py-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <UserAvatar name={name} imageUrl={avatarUrl} />
        </div>

        <span className="font-medium text-foreground">{name}</span>
      </div>

      {showRemove && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={onRemove}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                <span>Remove from class</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
