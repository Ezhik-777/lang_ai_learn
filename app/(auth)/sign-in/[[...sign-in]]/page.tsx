import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "../../appearance";

export default function Page() {
  return <SignIn appearance={clerkAppearance} />;
}
