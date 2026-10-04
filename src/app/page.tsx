import { redirect } from "next/navigation";

// There is no landing page. The middleware has already sent anyone without a
// session to /login by the time this runs.
export default function Home() {
  redirect("/dashboard");
}
