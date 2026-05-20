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
    <div className="flex items-center justify-between py-4 border-b border-gray-200 group hover:bg-gray-50 px-2 rounded-md transition-colors">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image src={avatarUrl} alt={name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {name.charAt(0)}
          </div>
        )}

        <span className="font-medium text-gray-900">{name}</span>
      </div>

      {showRemove && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full"
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