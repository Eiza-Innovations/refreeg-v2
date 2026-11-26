import { redirect } from "next/navigation";

// The wishlist builder moved into the dashboard so every creation flow on
// RefreeG lives under the same shell. Old links (share pages, emails, the
// footer) land here and hop one hop to the real flow.
export default function NewWishlistPage() {
  redirect("/dashboard/wishlists/create");
}
