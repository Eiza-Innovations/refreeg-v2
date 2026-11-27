import { formatThousands } from "@/lib/format-number-input";

describe("formatThousands", () => {
  it("groups digits in thousands", () => {
    expect(formatThousands("5000000")).toBe("5,000,000");
  });

  it("reformats an already grouped value as it grows or shrinks", () => {
    expect(formatThousands("5,000,0000")).toBe("50,000,000");
    expect(formatThousands("5,000,00")).toBe("500,000");
  });

  it("drops anything that is not a digit and clears when nothing is left", () => {
    expect(formatThousands("₦12a,5")).toBe("125");
    expect(formatThousands("abc")).toBe("");
  });

  it("never rounds a long value and stops accepting digits at a sensible length", () => {
    expect(formatThousands("99999999999999999999")).toBe("999,999,999,999");
    expect(formatThousands("123456789012345")).toBe("123,456,789,012");
  });

  it("drops leading zeros but keeps a single zero", () => {
    expect(formatThousands("000500")).toBe("500");
    expect(formatThousands("0")).toBe("0");
  });
});
