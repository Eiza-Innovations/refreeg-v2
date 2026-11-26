"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { Edit, Eye, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteItemDialog } from "@/components/dashboard/DeleteItemDialog";
import { toast } from "@/hooks/use-toast";

type Props = {
  /** "campaign" or "petition": used in the menu and dialog copy. */
  noun: string;
  viewHref: string;
  editHref: string;
  onDelete: () => Promise<void>;
};

/** The view, edit and delete menu on a card in My campaigns and My petitions. */
export function MyItemMenu({ noun, viewHref, editHref, onDelete }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: onDelete,
    onSuccess: () => {
      setConfirming(false);
      toast({ title: `Deleted ${noun}` });
      router.refresh();
    },
    onError: (error) =>
      toast({
        title: `Could not delete ${noun}`,
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-1 h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={viewHref}>
              <Eye className="mr-2 h-4 w-4" />
              View {noun}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Edit className="mr-2 h-4 w-4" />
              Edit {noun}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirming(true)}
            className="text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete {noun}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteItemDialog
        noun={noun}
        open={confirming}
        onOpenChange={setConfirming}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
