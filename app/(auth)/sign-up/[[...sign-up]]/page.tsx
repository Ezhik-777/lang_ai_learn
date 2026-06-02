import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "../../appearance";

export default function Page() {
  return <SignUp appearance={clerkAppearance} />;
}
