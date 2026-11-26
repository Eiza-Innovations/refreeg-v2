jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  createWishlist: jest.fn(),
  addWishlistItem: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createWishlist,
  addWishlistItem,
} from "@/actions/wishlists/wishlist-actions";
import { CreateWishlistForm } from "@/components/wishlist/create-wishlist-form";

const createdWishlist = {
  success: true,
  data: { id: "w-1", slug: "nomsos-wishlist", title: "Nomso's Wishlist" },
};

const fillRow = (index: number, name: string, price: string) => {
  fireEvent.change(screen.getByLabelText(`Item name ${index}`), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(`Price (₦) ${index}`), {
    target: { value: price },
  });
};

describe("CreateWishlistForm item rows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createWishlist as jest.Mock).mockResolvedValue(createdWishlist);
    (addWishlistItem as jest.Mock).mockResolvedValue({ success: true });
  });

  const goToStep2 = () => {
    fireEvent.change(screen.getByLabelText("Wishlist name"), {
      target: { value: "Nomso's Wishlist" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  };

  it("starts with one row and grows up to the 8-item cap", () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    expect(screen.getByText("1 of 8")).toBeInTheDocument();

    const add = screen.getByRole("button", { name: /Add another item/ });
    for (let i = 0; i < 7; i += 1) fireEvent.click(add);

    expect(screen.getByText("8 of 8")).toBeInTheDocument();
    expect(add).toBeDisabled();
    expect(screen.getByLabelText("Item name 8")).toBeInTheDocument();
  });

  it("refuses to create a wishlist with no items at all", () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    fireEvent.click(screen.getByRole("button", { name: "Create wishlist" }));

    expect(createWishlist).not.toHaveBeenCalled();
    expect(
      screen.getByText("Add at least one item before creating your wishlist."),
    ).toBeInTheDocument();
  });

  it("drops blank extra rows and creates the wishlist with the filled ones", async () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    fireEvent.click(screen.getByRole("button", { name: /Add another item/ }));
    fillRow(2, "A new study desk", "80000");

    fireEvent.click(screen.getByRole("button", { name: "Create wishlist" }));

    await waitFor(() => expect(createWishlist).toHaveBeenCalledTimes(1));
    expect(addWishlistItem).toHaveBeenCalledTimes(1);
    expect(addWishlistItem).toHaveBeenCalledWith("w-1", {
      name: "A new study desk",
      price: 80000,
      note: undefined,
    });
    expect(push).toHaveBeenCalledWith("/nomso/nomsos-wishlist");
  });

  it("flags an under-priced item on its own row", async () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    fillRow(1, "Too cheap", "50");
    fireEvent.click(screen.getByRole("button", { name: "Create wishlist" }));

    expect(createWishlist).not.toHaveBeenCalled();
    expect(
      screen.getByText("The smallest item price is ₦100."),
    ).toBeInTheDocument();
  });

  it("adds every valid row in order", async () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    fireEvent.click(screen.getByRole("button", { name: /Add another item/ }));
    fillRow(2, "A new study desk", "80000");
    fireEvent.click(screen.getByRole("button", { name: /Add another item/ }));
    fillRow(3, "Noise-cancelling headphones", "40000");

    fireEvent.click(screen.getByRole("button", { name: "Create wishlist" }));

    await waitFor(() => expect(addWishlistItem).toHaveBeenCalledTimes(2));
    expect(addWishlistItem).toHaveBeenNthCalledWith(1, "w-1", {
      name: "A new study desk",
      price: 80000,
      note: undefined,
    });
    expect(addWishlistItem).toHaveBeenNthCalledWith(2, "w-1", {
      name: "Noise-cancelling headphones",
      price: 40000,
      note: undefined,
    });
  });

  it("lets the owner remove a row they no longer want", () => {
    render(<CreateWishlistForm seasonal={false} username="nomso" />);
    goToStep2();

    fireEvent.click(screen.getByRole("button", { name: /Add another item/ }));
    expect(screen.getByText("2 of 8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove item 2" }));
    expect(screen.getByText("1 of 8")).toBeInTheDocument();
    expect(screen.queryByLabelText("Item name 2")).not.toBeInTheDocument();
  });
});
