import Link from "next/link";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <>
      <h1>Test sign-in</h1>
      <p className="mt-1 max-w-xl text-sm muted">
        You do not need to sign in: FrontRow already works for you as a guest. Signing in with an email just lets your favourites follow you to other
        devices, and whatever you saved as a guest comes with you.
      </p>
      <div className="mt-4"><SignInForm /></div>
      <p className="mt-4 text-sm"><Link href="/" className="underline underline-offset-2">Keep going as a guest</Link></p>
    </>
  );
}
