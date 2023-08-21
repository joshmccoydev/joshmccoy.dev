import './globals.css'
import Image from 'next/image'
import Link from 'next/link'
import {AiFillGithub, AiFillTwitterCircle} from 'react-icons/ai'
import {Button} from "@/components/ui/button"
import logoblack from '/public/logoblack.png'
import logowhite from '/public/logowhite.png'
import { Analytics } from '@vercel/analytics/react';


export const metadata = {
  title: 'Josh McCoy - Full-stack Web Developer',
  description: '',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-screen">
      <body className="overflow-hidden bg-gradient-to-b from-slate-200 to-slate-100 dark:bg-gradient-to-b dark:from-black dark:to-slate-900 dark:text-slate-300">
        <div className="z-50">
          <nav className="mx-auto w-5/6 md:w-2/3 lg:w-1/2 p-4 mt-5 dark:bg-none dark:bg-slate-800 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-between rounded-full flex shadow-md shadow-slate-600">
            <Link href="/">
              <span className="flex">
                <Image src={logoblack} className="mx-auto rounded-full block dark:hidden"
                  alt="My Logo"
                  width="50"
                  height="50" />
                  <Image src={logowhite} className="mx-auto rounded-full hidden dark:block"
                  alt="My Logo"
                  width="50"
                  height="50" />
                <h1 className="text-2xl my-auto">JM</h1>
              </span>
            </Link>
          
            <Link href="https://blog.joshmccoy.dev" className="my-auto">
              <Button className="bg-transparent px-8 rounded-3xl text-slate bg-slate-200 text-black dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500 dark:text-slate-300">
                Blog
              </Button>
            </Link>
          </nav>
        </div>
        {children}
        <div className="w-full fixed bottom-5">
          <footer className="w-5/6 md:w-2/3 lg:w-1/2 mx-auto">
            <ul className="dark:bg-none dark:bg-slate-800 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-center rounded-full shadow-md shadow-slate-600 flex gap-2 py-4 text-2xl">
              
              {/* Fix these links */}

              <a href="http://github.com/joshmccoydev"><li><AiFillGithub /></li></a>
            </ul>
          </footer>
        </div>
        <Analytics />;
      </body>
    </html>
  )
}