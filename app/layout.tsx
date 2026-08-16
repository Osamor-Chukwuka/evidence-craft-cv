import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "@/styles.css";

export const metadata: Metadata = {
  title: {
    default: "Evidence Craft - Developer CV workspace",
    template: "%s - Evidence Craft",
  },
  description:
    "Reconstruct meaningful engineering work from GitHub evidence, review it, and turn it into a CV you can defend.",
  openGraph: {
    title: "Evidence Craft - Developer CV workspace",
    description: "A developer CV workspace built from real GitHub evidence.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
