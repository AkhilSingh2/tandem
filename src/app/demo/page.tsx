import { DemoClient } from "@/components/demo/demo-client";

export const metadata = {
  title: "Two-person demo · Tandem",
  description: "Watch two real Tandem clients share a room, side by side.",
};

export default function DemoPage() {
  return <DemoClient />;
}
