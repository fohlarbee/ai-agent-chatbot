import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title:'Fast',
    desc:'Real-time streamed Responses'
  },
  {
    title:'Modern',
    desc:'NextJs 15, Tailwind CSS, Convex, Clerk'
  },
  {
    title:'Smart',
    desc:'Powered by your favourites LLM&apos;s'
  },

]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff] to-gray-50/50
    flex items-center justify-center">
      {/* Background pattern */}
        <div className="absolute inset-0 -z-10 h-full w-full
        bg-[#fff] bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),
        linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:6rem_4rem]"/>

        <section className="w-full px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 flex flex-col items-center space-y-10"
        >
          <header className="space-y-6">
              <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-400
              bg-clip-text text-transparent">
                AI Agent Assistant
              </h1>
              <p className="max-w-[600px] text-lg text-gray-600 md:text-xl/relaxed xl:text-2xl/relaxed">
              Meet your new AI chat companion that goes beyond conversation - it actually get things done!
              <br />
              <span className="text-gray-400 text-sm">
                Powered by IBM&apos;s WxTools & your favorite LLMs.
              </span>
              </p>
          </header>
          <SignedIn>
            <Link href='/dashboard'>
                <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium
                text-[#fff] bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700
                transition-all duration-200 ease-in-out shadow-lg shadow-gray-900/30 hover:shadow-xl hover:translate-y-0.5">
                    Get Started

                    <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover::translate-x-0.5"/>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-900/20 to-gray-800/20 blur-xl opacity-70
                    group-hover:opacity-100 transition-opacity"/>
                </button>
            </Link>
          </SignedIn>

          <SignedOut>
            <SignInButton
            mode="modal"
            fallbackRedirectUrl="/dashboard"
            forceRedirectUrl="/dashboard"
            >
              <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium
              text-[#fff] bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700
                transition-all duration-200 ease-in-out shadow-lg shadow-gray-900/30 hover:shadow-xl hover:translate-y-0.5">
                  Sign up
                   <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover::translate-x-0.5"/>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-900/20 to-gray-800/20 blur-xl opacity-70
                    group-hover:opacity-100 transition-opacity"/>
              </button>
            </SignInButton>
          </SignedOut>

          {/* featured grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 pt-8 max-w-3xl mx-auto">
            {features.map((f, i) => (
              <div className="text-center" key={i}>
                <div className="text-2xl font-semibold text-gray-900">
                  {f.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
    </main>
  )
}
