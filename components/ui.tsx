import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Shared TTS-brand primitives (handoff §14). Tailwind utilities mirror the
// prototype's CSS block in prove-your-worth.jsx.

/** Mobile-first ~460px white frame on the cream page background. */
export function AppShell({
  children,
  minScreen = false,
}: {
  children: ReactNode;
  minScreen?: boolean;
}) {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="relative w-full max-w-app overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,73,49,0.06)]">
        <div
          className={`flex flex-col px-[22px] pb-[30px] pt-[26px] ${
            minScreen ? "min-h-screen" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function Eyebrow({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "deep" | "lemon";
}) {
  const color =
    tone === "deep"
      ? "text-deep"
      : tone === "lemon"
        ? "text-lemon"
        : "text-green";
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${color}`}
    >
      {children}
    </div>
  );
}

export function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold text-deep"
    >
      {children}
    </label>
  );
}

export function Field(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-field border-[1.5px] border-[#DCE6E0] bg-white px-[14px] py-[13px] text-[15px] text-ink outline-none transition focus:border-green ${
        props.className ?? ""
      }`}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "dark" | "ghost" | "lemon";
};

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-green text-white hover:brightness-105",
  dark: "bg-deep text-lemon",
  ghost: "bg-white text-deep border-[1.5px] border-green",
  lemon: "bg-lemon text-deep",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-center gap-2 rounded-btn px-[18px] py-[15px] text-[15px] font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT[variant]} ${className ?? ""}`}
    />
  );
}

export function Card({
  children,
  tone = "wash",
  className,
}: {
  children: ReactNode;
  tone?: "wash" | "cream" | "deep" | "plain";
  className?: string;
}) {
  const toneCls =
    tone === "wash"
      ? "bg-green-50 border-[1.5px] border-green"
      : tone === "cream"
        ? "bg-cream border-[1.5px] border-yellow"
        : tone === "deep"
          ? "bg-deep text-white"
          : "border-[1.5px] border-[#DCE6E0]";
  return (
    <div className={`rounded-card p-[18px] ${toneCls} ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function Tagline() {
  return (
    <div className="font-display py-[18px] text-center text-xs font-bold italic text-green">
      Dignified Work for a Digital Future.
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-[12.5px] text-red">{children}</p>;
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-[13px] font-semibold text-green underline">
      {children}
    </Link>
  );
}
