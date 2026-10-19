import { HomePage } from "@/components/views/home-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PickleFlex | Your game. Your people. Your pace.",
  description: "Find pickleball tournaments and your next great match with PickleFlex.",
};

export default function Home() {
  return <HomePage />;
}
