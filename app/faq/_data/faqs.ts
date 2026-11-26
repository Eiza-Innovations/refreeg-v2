export type FaqCategory = {
  id: string;
  name: string;
  items: FaqItem[];
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const COMMUNITY_LINK = "https://t.me/+ibsgFy6SL0AwYmE8";

export const faqCategories: FaqCategory[] = [
  {
    id: "general",
    name: "General",
    items: [
      {
        id: "what-is-refreeg",
        question: "What is Refreeg?",
        answer:
          "Refreeg is a crowdfunding platform for causes that build socio-economic growth in African communities, with every donation recorded on the blockchain.",
      },
      {
        id: "transparency",
        question: "How does Refreeg keep giving transparent?",
        answer:
          "Every donation is written to the blockchain, so it is public and can't be edited after the fact. You can follow your money from your wallet to the milestone it paid for.",
      },
      {
        id: "causes-supported",
        question: "What kinds of causes can I support?",
        answer:
          "Healthcare, education, disaster relief, community development, climate and small business funding, with a focus on African communities.",
      },
      {
        id: "different",
        question: "How is Refreeg different from other platforms?",
        answer:
          "Funds sit in escrow and are released on milestones with proof, every transaction is publicly verifiable, and every campaign is identity-verified before it goes live.",
      },
      {
        id: "what-can-i-crowdfund",
        question: "What can I crowdfund on Refreeg?",
        answer:
          "Curious about what you can crowdfund for? Here are some ideas. Businesses launch CSR campaigns, support community-driven causes, and connect with customers who care about impact. Nonprofits raise more and reach more with transparent fundraising tools designed to help them thrive and grow their donor communities. Disaster relief campaigns rally urgent support for communities hit by disasters and get aid to those who need it, quickly and securely. Healthcare fundraising gives hope a platform, covering medical bills, healthcare projects and critical treatments with transparency and community support. Creators fund their next project, tour or release with a page their audience can find, share and trust. You can also create a wishlist: name the specific gifts you want and let family and friends give toward them together. Read the full guide with examples for each on the What can I crowdfund? page at refreeg.com/crowdfund.",
      },
      {
        id: "cause-legit",
        question: "How do I know a cause is legitimate?",
        answer:
          "Every campaign is reviewed by our moderation team before it becomes publicly visible, and every fundraiser is identity-verified (KYC) first. Approved causes also carry trust indicators, and because every donation is recorded on the blockchain you can follow the money from wallet to milestone yourself.",
      },
      {
        id: "what-is-a-wishlist",
        question: "What is a wishlist?",
        answer:
          "A wishlist is a list of specific gifts you actually want. You name the items and prices, share one link, and family and friends give toward an item together or on their own, fully or partially, anonymously if they prefer. The money settles to your payout account, and you can see who gave to coordinate delivery. Create one at refreeg.com/wishlist.",
      },
      {
        id: "wishlist-items",
        question: "How many items can a wishlist hold?",
        answer:
          "Up to 8 items per wishlist. You can add them while creating the list, or start with one and add the rest any time from your dashboard.",
      },
    ],
  },
  {
    id: "donations",
    name: "Donations",
    items: [
      {
        id: "milestone-releases",
        question: "How do milestone releases work?",
        answer:
          "Funds are held in escrow and released only when a milestone is met, with photo proof or receipts. You get an update each time.",
      },
      {
        id: "payment-methods",
        question: "Can I pay with card or bank transfer?",
        answer:
          "Yes. You can give with a card, a bank transfer or a crypto wallet. Whichever you choose, the donation is recorded on-chain.",
      },
      {
        id: "receipts",
        question: "Will I get a receipt?",
        answer:
          "Yes. Every donation produces a receipt in your name that links to the on-chain record, so you can verify it any time.",
      },
      {
        id: "wishlist-giving",
        question: "Do gifts to wishlists count as giving too?",
        answer:
          "Yes. Your dashboard's giving total includes what you gave to wishlists alongside what you gave to causes, and the Your giving card breaks the two out separately so you always know where your money went.",
      },
    ],
  },
  {
    id: "campaigns",
    name: "Campaigns",
    items: [
      {
        id: "kyc-before-launch",
        question: "Do I need KYC before launching a cause?",
        answer:
          "Yes. Creating a cause or petition requires an approved identity verification (KYC) and a complete profile. It keeps fundraising safer for donors, cuts down on fraud, and is also what unlocks payout setup for wishlists.",
      },
      {
        id: "start-a-cause",
        question: "How do I start a cause?",
        answer:
          "Sign up, verify your identity, then create your campaign with a story, a goal and milestones. We review it before it goes live.",
      },
      {
        id: "fees",
        question: "What fees does Refreeg charge?",
        answer:
          "Our fee policy lists every fee up front, with no hidden charges. See the fee policy page for the current breakdown.",
      },
      {
        id: "payout-speed",
        question: "How fast do funds reach my cause?",
        answer:
          "Donations settle on-chain in seconds. Payouts to your cause are released as each milestone is approved.",
      },
    ],
  },
];
