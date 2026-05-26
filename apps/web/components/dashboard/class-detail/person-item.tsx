import Image from 'next/image';

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
  avatarUrl?: string;
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
    <div className="flex items-center justify-between py-4 border-b border-border/40 group hover:bg-muted/10 px-3 rounded-xl transition-all duration-200">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border/80">
            <Image src={avatarUrl} alt={name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            {name.charAt(0)}
          </div>
        )}

        <span className="font-semibold text-foreground text-sm tracking-wide">{name}</span>
      </div>

      {showRemove && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
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