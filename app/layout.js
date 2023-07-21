import './globals.css'
import {AiFillGithub, AiFillTwitterCircle} from 'react-icons/ai'

export const metadata = {
  title: 'Josh McCoy - Full-stack Web Developer',
  description: '',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="min-h-full">
      <body className="container mx-auto">
        <div className="container fixed top-6 w-full">
          <nav className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 justify-between rounded-full flex shadow-lg p-4">
            <h1 className="text-2xl">jm</h1>
            <ul className="flex space-x-10">
              <li></li>
              <li>Skills</li>
              <li>My Work</li>
              <li>Contact</li>
            </ul>
          </nav>
        </div>
        {children}
        <div className="container fixed bottom-6 w-full">
          <footer className="">
            <ul className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex shadow-lg py-4 justify-center text-2xl">
              <li><AiFillGithub /></li>
              <li><AiFillTwitterCircle /></li>
            </ul>
          </footer>
        </div>
      </body>
    </html>
  )
}