import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyItemMenu } from "@/components/dashboard/MyItemMenu";
import { toast } from "@/hooks/use-toast";

const refresh = jest.fn();
jest.mock("nextjs-toploader/app", () => ({
  useRouter: () => ({ refresh }),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

function setup(onDelete: () => Promise<void>) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MyItemMenu
        noun="campaign"
        viewHref="/causes/c1"
        editHref="/dashboard/causes/c1/edit"
        onDelete={onDelete}
      />
    </QueryClientProvider>,
  );
}

async function openDeleteDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More options" }));
  await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
  return user;
}

describe("MyItemMenu", () => {
  beforeEach(() => jest.clearAllMocks());

  it("offers view, edit and delete", async () => {
    setup(jest.fn());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "More options" }));

    expect(
      await screen.findByRole("menuitem", { name: /View campaign/ }),
    ).toHaveAttribute("href", "/causes/c1");
    expect(
      screen.getByRole("menuitem", { name: /Edit campaign/ }),
    ).toHaveAttribute("href", "/dashboard/causes/c1/edit");
  });

  it("deletes only after confirming, then refreshes the list", async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    setup(onDelete);
    const user = await openDeleteDialog();

    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete campaign" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: "Deleted campaign" });
  });

  it("shows the real error and keeps the item when delete fails", async () => {
    setup(jest.fn().mockRejectedValue(new Error("Has donations")));
    const user = await openDeleteDialog();

    await user.click(screen.getByRole("button", { name: "Delete campaign" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Could not delete campaign",
          description: "Has donations",
        }),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
