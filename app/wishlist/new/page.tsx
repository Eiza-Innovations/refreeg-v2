import { redirect } from "next/navigation";

export default function NewWishlistPage() {
  redirect("/dashboard/wishlists/create");
}
