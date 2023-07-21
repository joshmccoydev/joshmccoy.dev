import './globals.css'
import {AiFillGithub, AiFillTwitterCircle} from 'react-icons/ai'
import {Button} from "@/components/ui/button"

export const metadata = {
  title: 'Josh McCoy - Full-stack Web Developer',
  description: '',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="min-h-full">
      <body className="container mx-auto">
        <div className="container fixed top-10 w-full">
          <nav className="w-3/4 mx-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-between rounded-full flex shadow-lg p-4">
            <h1 className="text-2xl">jm</h1>
            <Button className="bg-transparent shadow-lg outline-dashed rounded-3xl text-black">
              Click me!
            </Button>
          </nav>
        </div>
        {children}
        <div className="container fixed bottom-10 w-full">
          <footer className="w-3/4 mx-auto">
            <ul className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-center rounded-full flex shadow-lg py-4 text-2xl">
              <li><AiFillGithub /></li>
              <li><AiFillTwitterCircle /></li>
            </ul>
          </footer>
        </div>
      </body>
    </html>
  )
}