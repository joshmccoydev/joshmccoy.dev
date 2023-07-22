import './globals.css'
import Image from 'next/image'
import {AiFillGithub, AiFillTwitterCircle} from 'react-icons/ai'
import {Button} from "@/components/ui/button"
import logo2 from '/public/logo2.png'

export const metadata = {
  title: 'Josh McCoy - Full-stack Web Developer',
  description: '',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="min-h-full">
      <body className=" bg-gradient-to-b from-slate-200 to-slate-100 dark:bg-slate-900 dark:text-slate-300">
        <div className="fixed top-10 w-full z-50">
          <nav className=" mx-auto dark:bg-none dark:bg-slate-800 w-11/12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-between rounded-full flex shadow-lg p-4">
          <span className="flex">
            <Image src={logo2} className="mx-auto rounded-full"
              alt="My Logo"
              width="50"
              height="50" />
            <h1 className="text-2xl my-auto">JM</h1>
            </span>
            <Button className="my-auto bg-transparent shadow-lg rounded-3xl bg-none bg-slate-200  text-black dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500">
              Contact Me
            </Button>
          </nav>
        </div>
        {children}
        <div className="fixed bottom-10 w-full">
          <footer className="w-full">
            <ul className="mx-auto w-11/12 dark:bg-none bg-gradient-to-r  from-indigo-500 via-purple-500 to-pink-500 justify-center rounded-full flex shadow-lg py-4 text-2xl">
              <li><AiFillGithub /></li>
              <li><AiFillTwitterCircle /></li>
            </ul>
          </footer>
        </div>
      </body>
    </html>
  )
}